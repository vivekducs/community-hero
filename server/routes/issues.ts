import express from 'express';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCoordinatesDistanceMeters } from '../helpers';
import { handleAgentIngestion, handleAgentDuplicateDetection } from './agent';

const router = express.Router();
const PORT = 3000;

// POST /api/issues
router.post('/issues', async (req, res) => {
  const { 
    title, 
    description, 
    image_url, 
    location, 
    severity, 
    created_by, 
    created_by_name, 
    category: reqCategory, 
    subcategory: reqSubcategory, 
    department: reqDepartment 
  } = req.body;

  if (!title || !location) {
    return res.status(400).json({ error: "Title and location are required" });
  }

  try {
    // AI Triage & Verification
    let category = reqCategory || 'Roads';
    let subcategory = reqSubcategory || 'Pothole';
    let department = reqDepartment || 'Department of Transportation';
    let confidence = 85;

    let image_clear = true;
    let issue_visible = true;
    let image_feedback = '';
    let image_flagged_status = 'none';
    let status = 'reported';

    // Always call the insights API if we don't have a category OR we have an image to verify!
    if (!reqCategory || image_url) {
      try {
        const insightsResponse = await fetch(`http://localhost:${PORT}/api/gemini/insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title, 
            description: description || "No description provided",
            image: image_url || undefined
          })
        });
        if (insightsResponse.ok) {
          const data = await insightsResponse.json();
          if (!reqCategory) {
            category = data.category || category;
            subcategory = data.subcategory || subcategory;
            department = data.department || department;
            confidence = data.confidence || confidence;
          }
          if (image_url) {
            image_clear = data.image_clear !== undefined ? data.image_clear : true;
            issue_visible = data.issue_visible !== undefined ? data.issue_visible : true;
            image_feedback = data.image_feedback || '';
            image_flagged_status = data.image_flagged_status || 'none';
          }
        }
      } catch (insightsErr) {
        console.error("AI Insights check failed in /api/issues:", insightsErr);
      }
    }

    // Check if image is flagged as invalid (blurry, irrelevant, clean road)
    if (image_url && image_flagged_status !== 'none' && image_flagged_status !== 'valid') {
      // Query for previously auto_discarded issues by this user OR near this location
      const q = query(
        collection(db, 'issues'),
        where('created_by', '==', created_by || 'anonymous'),
        where('status', '==', 'auto_discarded')
      );
      const querySnapshot = await getDocs(q);
      let previousDiscardedFound = false;

      for (const docSnap of querySnapshot.docs) {
        const d = docSnap.data();
        if (d.category === category) {
          previousDiscardedFound = true;
          break;
        }
        if (d.location && location) {
          const dist = getCoordinatesDistanceMeters(
            parseFloat(d.location.lat), 
            parseFloat(d.location.lng), 
            parseFloat(location.lat), 
            parseFloat(location.lng)
          );
          if (dist <= 100) {
            previousDiscardedFound = true;
            break;
          }
        }
      }

      if (!previousDiscardedFound) {
        // Discard this request the first time!
        status = 'auto_discarded';
        department = 'Discarded Alerts';
      } else {
        // "if again the same issue then it can be sent to the dept only"
        // Meaning we do NOT discard it this time! It is allowed to proceed as active.
        status = 'reported';
      }
    }

    const issue_id = 'issue_' + Math.random().toString(36).substr(2, 9);
    const newIssue = {
      issue_id,
      title,
      description: description || '',
      image_urls: image_url ? [image_url] : [],
      location: {
        lat: parseFloat(location.lat) || 28.7041,
        lng: parseFloat(location.lng) || 77.1025
      },
      category,
      subcategory,
      severity: severity || 'medium',
      confidence,
      status,
      department,
      created_by: created_by || 'anonymous',
      created_by_name: created_by_name || 'Citizen Sentinel',
      upvotes: 1,
      downvotes: 0,
      verification_percentage: 100,
      escalation_level: 1,
      image_feedback,
      image_flagged_status,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'issues', issue_id), newIssue);

    // Add initial submission notification
    const initialNotifId = 'notif_' + Math.random().toString(36).substr(2, 9);
    if (status === 'auto_discarded') {
      await setDoc(doc(db, 'notifications', initialNotifId), {
        notification_id: initialNotifId,
        issue_id: issue_id,
        user_id: created_by || 'anonymous',
        message: `⚠️ Alert: Your report "${title}" was automatically filtered/discarded because our AI model detected that the attached photo is invalid (${image_feedback || 'unclear/irrelevant'}). Please report it again with a clear photo showing the actual problem.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    } else {
      await setDoc(doc(db, 'notifications', initialNotifId), {
        notification_id: initialNotifId,
        issue_id: issue_id,
        user_id: created_by || 'anonymous',
        message: `Your reported issue "${title}" has been successfully logged and submitted.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    // Trigger Autonomous Ingestion & Dispatch Agent (Agent 1) if not discarded
    if (status !== 'auto_discarded') {
      try {
        await handleAgentIngestion(issue_id);
      } catch (ingestErr) {
        console.error("Auto-ingestion agent failed:", ingestErr);
      }

      // Trigger Autonomous Duplicate Detection Agent (Agent 2)
      try {
        await handleAgentDuplicateDetection(issue_id);
      } catch (dupErr) {
        console.error("Auto-duplicate detection agent failed:", dupErr);
      }
    }

    // Retrieve final fully-processed issue document
    const finalDocSnap = await getDoc(doc(db, 'issues', issue_id));
    const processedIssue = finalDocSnap.exists() ? finalDocSnap.data() : newIssue;

    // Increment reporter's credibility & count if applicable
    if (created_by && created_by !== 'anonymous') {
      try {
        const userRef = doc(db, 'users', created_by);
        await updateDoc(userRef, {
          total_issues_reported: increment(1),
          credibility_score: increment(15)
        });
      } catch (err) {
        console.error("Failed to update user metrics:", err);
      }
    }

    res.status(201).json(processedIssue);
  } catch (err: any) {
    console.error("Failed to create issue:", err);
    res.status(500).json({ error: err.message || "Failed to create issue" });
  }
});

// GET /api/issues
router.get('/issues', async (req, res) => {
  const { category, status } = req.query;
  try {
    const issuesCol = collection(db, 'issues');
    const q = query(issuesCol);
    const querySnapshot = await getDocs(q);
    let issues: any[] = [];
    querySnapshot.forEach((docSnap) => {
      issues.push(docSnap.data());
    });

    // Filter in-memory if needed (handles complex composite index limits safely)
    if (category && category !== 'All') {
      issues = issues.filter(i => i.category === category);
    }
    if (status && status !== 'All') {
      issues = issues.filter(i => i.status === status);
    }

    // Sort by newest
    issues.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json(issues);
  } catch (err: any) {
    console.error("Failed to fetch issues:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/issues/map
router.get('/issues/map', async (req, res) => {
  const { category, status } = req.query;
  try {
    const issuesCol = collection(db, 'issues');
    const querySnapshot = await getDocs(issuesCol);
    let issues: any[] = [];
    querySnapshot.forEach((docSnap) => {
      issues.push(docSnap.data());
    });

    if (category && category !== 'All') {
      issues = issues.filter(i => i.category === category);
    }
    if (status && status !== 'All') {
      issues = issues.filter(i => i.status === status);
    }

    const features = issues.map(issue => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [issue.location.lng, issue.location.lat]
      },
      properties: {
        issue_id: issue.issue_id,
        title: issue.title,
        category: issue.category,
        status: issue.status,
        upvotes: issue.upvotes
      }
    }));

    res.json({
      type: "FeatureCollection",
      features
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/issues/:issueId
router.get('/issues/:issueId', async (req, res) => {
  const { issueId } = req.params;
  try {
    const docSnap = await getDoc(doc(db, 'issues', issueId));
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }
    res.json(docSnap.data());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/issues/:issueId/verify
router.post('/issues/:issueId/verify', async (req, res) => {
  const { issueId } = req.params;
  const { user_id, vote } = req.body; // vote: "upvote" | "downvote"
  if (!user_id || !vote) {
    return res.status(400).json({ error: "user_id and vote are required" });
  }

  try {
    const verificationId = `v_${issueId}_${user_id}`;
    const verRef = doc(db, 'verifications', verificationId);
    const verSnap = await getDoc(verRef);

    const issueRef = doc(db, 'issues', issueId);
    const issueSnap = await getDoc(issueRef);
    if (!issueSnap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const issueData = issueSnap.data();
    let upvotes = issueData.upvotes || 0;
    let downvotes = issueData.downvotes || 0;

    if (verSnap.exists()) {
      const oldVote = verSnap.data().status; // "confirm" (upvote) or "reject" (downvote)
      const newStatus = vote === 'upvote' ? 'confirm' : 'reject';

      if (oldVote !== newStatus) {
        // Changed vote
        if (newStatus === 'confirm') {
          upvotes += 1;
          downvotes = Math.max(0, downvotes - 1);
        } else {
          downvotes += 1;
          upvotes = Math.max(0, upvotes - 1);
        }
        await setDoc(verRef, {
          verification_id: verificationId,
          issue_id: issueId,
          user_id,
          status: newStatus,
          created_at: new Date().toISOString()
        });
      }
    } else {
      // New vote
      if (vote === 'upvote') {
        upvotes += 1;
      } else {
        downvotes += 1;
      }
      await setDoc(verRef, {
        verification_id: verificationId,
        issue_id: issueId,
        user_id,
        status: vote === 'upvote' ? 'confirm' : 'reject',
        created_at: new Date().toISOString()
      });

      // Award Community Hero points
      try {
        const userRef = doc(db, 'users', user_id);
        await updateDoc(userRef, {
          community_hero_points: increment(10),
          credibility_score: increment(5)
        });
      } catch (err) {
        console.error("Failed to add community hero points", err);
      }
    }

    const total = upvotes + downvotes;
    const verification_percentage = total > 0 ? Math.round((upvotes / total) * 100) : 100;

    await updateDoc(issueRef, {
      upvotes,
      downvotes,
      verification_percentage
    });

    // Notify the issue creator (citizen) when someone votes/confirms/disputes their issue
    if (issueData.created_by && issueData.created_by !== user_id) {
      const creatorNotifId = 'notif_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'notifications', creatorNotifId), {
        notification_id: creatorNotifId,
        issue_id: issueId,
        user_id: issueData.created_by,
        message: `Your reported issue "${issueData.title}" was ${vote === 'upvote' ? 'confirmed' : 'rejected/disputed'} by another citizen.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    // Notify the assigned officer if there is one
    if (issueData.assigned_to_person && issueData.assigned_to_person !== user_id) {
      const officerNotifId = 'notif_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'notifications', officerNotifId), {
        notification_id: officerNotifId,
        issue_id: issueId,
        user_id: issueData.assigned_to_person,
        message: `The issue "${issueData.title}" assigned to you has received a community ${vote === 'upvote' ? 'confirmation' : 'dispute/rejection'}.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    res.json({ upvotes, downvotes, verification_percentage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/issues/:issueId/comments
router.post('/issues/:issueId/comments', async (req, res) => {
  const { issueId } = req.params;
  const { user_id, author_name, text } = req.body;
  if (!user_id || !text) {
    return res.status(400).json({ error: "user_id and text are required" });
  }

  try {
    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const commentData = {
      comment_id: commentId,
      issue_id: issueId,
      author_id: user_id,
      author_name: author_name || 'Citizen Sentinel',
      text,
      upvotes: 0,
      created_at: new Date().toISOString()
    };

    // Create in subcollection: issues/{issueId}/comments/{commentId}
    await setDoc(doc(db, 'issues', issueId, 'comments', commentId), commentData);

    // Increment comments_count on issue
    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
      comments_count: increment(1)
    });

    res.status(201).json(commentData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/issues/:issueId/comments
router.get('/issues/:issueId/comments', async (req, res) => {
  const { issueId } = req.params;
  try {
    const commentsCol = collection(db, 'issues', issueId, 'comments');
    const q = query(commentsCol);
    const querySnapshot = await getDocs(q);
    const comments: any[] = [];
    querySnapshot.forEach((docSnap) => {
      comments.push(docSnap.data());
    });

    // Sort by newest
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json(comments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/issues/:issueId/comments/:commentId/upvote
router.post('/issues/:issueId/comments/:commentId/upvote', async (req, res) => {
  const { issueId, commentId } = req.params;
  try {
    const commentRef = doc(db, 'issues', issueId, 'comments', commentId);
    await updateDoc(commentRef, {
      upvotes: increment(1)
    });
    const commentSnap = await getDoc(commentRef);
    res.json({ upvotes: commentSnap.data()?.upvotes || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

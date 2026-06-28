import express from 'express';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

const router = express.Router();

// 1. GET /admin/dashboard or /api/admin/dashboard
router.get(['/admin/dashboard', '/api/admin/dashboard'], async (req, res) => {
  try {
    const { department } = req.query;
    const issuesCol = collection(db, 'issues');
    const snap = await getDocs(issuesCol);
    let list: any[] = [];
    snap.forEach(d => list.push(d.data()));

    // Filter by department if provided (case-insensitive)
    if (department && department !== 'all') {
      const deptStr = String(department).toLowerCase();
      list = list.filter(i => i.department && i.department.toLowerCase() === deptStr);
    }

    const total_assigned = list.length;
    const in_progress_count = list.filter(i => ['investigating', 'resolving', 'In Progress', 'assigned', 'Assigned'].includes(i.status)).length;
    
    // Resolved this month
    const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const resolved_count = list.filter(i => {
      if (i.status !== 'resolved') return false;
      const resolvedDate = i.resolved_at || i.created_at;
      return resolvedDate && resolvedDate.startsWith(currentMonth);
    }).length;

    // Avg resolution time
    let totalDays = 0;
    let resolvedWithTimeCount = 0;
    list.forEach(i => {
      if (i.status === 'resolved') {
        const start = new Date(i.created_at).getTime();
        const end = i.resolved_at ? new Date(i.resolved_at).getTime() : Date.now();
        const days = (end - start) / (24 * 3600 * 1000);
        totalDays += Math.max(0.1, days);
        resolvedWithTimeCount++;
      }
    });
    const avg_resolution_days = resolvedWithTimeCount > 0 ? parseFloat((totalDays / resolvedWithTimeCount).toFixed(1)) : 2.5;

    // Department Rating
    const rating = 4.6; // based on user reviews/statistics

    res.json({
      total_assigned,
      in_progress_count,
      resolved_count,
      avg_resolution_days,
      rating
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /admin/issues or /api/admin/issues
router.get(['/admin/issues', '/api/admin/issues'], async (req, res) => {
  try {
    const { status, priority, limit = 20, offset = 0, department, sort_by = 'created_at', order = 'desc' } = req.query;
    const issuesCol = collection(db, 'issues');
    const snap = await getDocs(issuesCol);
    let list: any[] = [];
    snap.forEach(d => list.push(d.data()));

    // Filter by department if provided (case-insensitive)
    if (department && department !== 'all') {
      const deptStr = String(department).toLowerCase();
      list = list.filter(i => i.department && i.department.toLowerCase() === deptStr);
    }

    // Filter by status
    if (status && status !== 'all') {
      const statusStr = String(status).toLowerCase();
      list = list.filter(i => i.status && i.status.toLowerCase() === statusStr);
    }

    // Filter by priority/severity
    if (priority && priority !== 'all') {
      const prioStr = String(priority).toLowerCase();
      list = list.filter(i => i.severity && i.severity.toLowerCase() === prioStr);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sort_by as string] || '';
      let valB = b[sort_by as string] || '';

      if (sort_by === 'priority' || sort_by === 'severity') {
        const priorityWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        valA = priorityWeights[a.severity] || 0;
        valB = priorityWeights[b.severity] || 0;
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const parsedLimit = parseInt(String(limit), 10);
    const parsedOffset = parseInt(String(offset), 10);
    const paginatedList = list.slice(parsedOffset, parsedOffset + parsedLimit);

    res.json(paginatedList);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /admin/issues/:issue_id or /api/admin/issues/:issue_id
router.get(['/admin/issues/:issue_id', '/api/admin/issues/:issue_id'], async (req, res) => {
  try {
    const { issue_id } = req.params;
    const issueRef = doc(db, 'issues', issue_id);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }
    res.json(snap.data());
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. PATCH /admin/issues/:issue_id/assign or /api/admin/issues/:issue_id/assign
router.patch(['/admin/issues/:issue_id/assign', '/api/admin/issues/:issue_id/assign'], async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { assigned_to_person_id } = req.body;
    if (!assigned_to_person_id) {
      return res.status(400).json({ error: "assigned_to_person_id is required" });
    }

    const issueRef = doc(db, 'issues', issue_id);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const issueData = snap.data();

    // Retrieve Officer/Staff Name
    let officerName = assigned_to_person_id;
    try {
      const staffRef = doc(db, 'staff', assigned_to_person_id);
      const staffSnap = await getDoc(staffRef);
      if (staffSnap.exists()) {
        officerName = staffSnap.data().name || assigned_to_person_id;
      }
    } catch (staffErr) {
      console.warn("Could not retrieve staff name:", staffErr);
    }

    const updatedFields = {
      assigned_to_person: assigned_to_person_id,
      status: "Assigned",
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await updateDoc(issueRef, updatedFields);

    // Create internal log / comment
    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const commentData = {
      comment_id: commentId,
      issue_id: issue_id,
      author_id: 'authority_dispatcher',
      author_name: '🛡️ Department Dispatcher',
      text: `Issue has been successfully assigned to worker: ${officerName}. Dispatch status set to ASSIGNED.`,
      upvotes: 0,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'issues', issue_id, 'comments', commentId), commentData);

    // 1. Push notification to citizen
    const userNotifId = 'notif_' + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'notifications', userNotifId), {
      notification_id: userNotifId,
      issue_id,
      user_id: issueData.created_by || 'anonymous',
      message: `Your reported issue "${issueData.title}" has been assigned to officer "${officerName}" for resolution.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    // 2. Push notification to assigned officer
    const officerNotifId = 'notif_' + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'notifications', officerNotifId), {
      notification_id: officerNotifId,
      issue_id,
      user_id: assigned_to_person_id,
      message: `You have been assigned to resolve the issue: "${issueData.title}".`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    res.json({ status: "success", message: "Issue assigned successfully", updatedFields });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 5. PATCH /admin/issues/:issue_id or /api/admin/issues/:issue_id
router.patch(['/admin/issues/:issue_id', '/api/admin/issues/:issue_id'], async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { status, progress_note } = req.body;
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const issueRef = doc(db, 'issues', issue_id);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const issueData = snap.data();
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'Resolved' || status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.status = 'resolved'; // canonical lowercase
    }

    await updateDoc(issueRef, updateData);

    // Add a status change log / comment
    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const commentData = {
      comment_id: commentId,
      issue_id: issue_id,
      author_id: 'authority_supervisor',
      author_name: '🛡️ Public Works Supervisor',
      text: `Status updated to ${status.toUpperCase()}.${progress_note ? ' Note: ' + progress_note : ''}`,
      upvotes: 0,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'issues', issue_id, 'comments', commentId), commentData);

    // Push notification to citizen
    const notifId = 'notif_' + Math.random().toString(36).substr(2, 9);
    const notifDoc = {
      notification_id: notifId,
      issue_id,
      user_id: issueData.created_by || 'anonymous',
      message: `Municipal Update: Your reported issue is now marked as "${status}".`,
      is_read: false,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notifId), notifDoc);

    res.json({ status: "success", updateData });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /admin/issues/:issue_id/progress-update or /api/admin/issues/:issue_id/progress-update
router.post(['/admin/issues/:issue_id/progress-update', '/api/admin/issues/:issue_id/progress-update'], async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ error: "note is required" });
    }

    const issueRef = doc(db, 'issues', issue_id);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }
    const issueData = snap.data();

    const note_id = 'note_' + Math.random().toString(36).substr(2, 9);
    const adminNoteDoc = {
      note_id,
      issue_id,
      author_id: 'authority_officer',
      text: note,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'admin_notes', note_id), adminNoteDoc);

    // 1. Notify the citizen/user
    const notifId = 'notif_' + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'notifications', notifId), {
      notification_id: notifId,
      issue_id,
      user_id: issueData.created_by || 'anonymous',
      message: `New progress note added to your issue "${issueData.title}": "${note}"`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    // 2. Notify the assigned officer if there is one
    if (issueData.assigned_to_person) {
      const officerNotifId = 'notif_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'notifications', officerNotifId), {
        notification_id: officerNotifId,
        issue_id,
        user_id: issueData.assigned_to_person,
        message: `New progress note added to your assigned issue "${issueData.title}": "${note}"`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    res.json({ status: "success", adminNoteDoc });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 7. POST /admin/issues/:issue_id/upload-photo or /api/admin/issues/:issue_id/upload-photo
router.post(['/admin/issues/:issue_id/upload-photo', '/api/admin/issues/:issue_id/upload-photo'], async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { photoUrl } = req.body;
    const fallbackUrl = photoUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800";

    const issueRef = doc(db, 'issues', issue_id);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const issueData = snap.data();
    const currentPhotos = issueData.before_after_photos || [];
    const updatedPhotos = [...currentPhotos, fallbackUrl];

    await updateDoc(issueRef, { before_after_photos: updatedPhotos });

    res.json({ status: "success", photo_url: fallbackUrl, before_after_photos: updatedPhotos });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 8. POST /gamification/award-badge or /api/gamification/award-badge
router.post(['/gamification/award-badge', '/api/gamification/award-badge'], async (req, res) => {
  try {
    const { user_id, badge_type } = req.body;
    if (!user_id || !badge_type) {
      return res.status(400).json({ error: "user_id and badge_type are required" });
    }

    // Check user profile
    const userRef = doc(db, 'users', user_id);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const userData = snap.data();
    const currentBadges = userData.badges_earned || [];

    if (currentBadges.includes(badge_type)) {
      return res.json({ status: "already_earned", badges_earned: currentBadges });
    }

    // Add badge
    const updatedBadges = [...currentBadges, badge_type];
    
    const badgeId = 'badge_' + Math.random().toString(36).substr(2, 9);
    const badgeDoc = {
      badge_id: badgeId,
      user_id,
      badge_type,
      earned_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'badges', badgeId), badgeDoc);

    const pointsToAdd = 50; 
    const newPoints = (userData.total_points || 0) + pointsToAdd;

    // Determine new tier
    let tier = userData.tier || "New";
    if (newPoints >= 200) tier = "Trusted";
    else if (newPoints >= 50) tier = "Active";

    await updateDoc(userRef, {
      badges_earned: updatedBadges,
      total_points: newPoints,
      tier
    });

    res.json({
      status: "success",
      badge_earned: badge_type,
      badges_earned: updatedBadges,
      total_points: newPoints,
      tier
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 9. GET /gamification/leaderboard or /api/gamification/leaderboard
router.get(['/gamification/leaderboard', '/api/gamification/leaderboard'], async (req, res) => {
  try {
    const { type = 'monthly_reporters', zone, limit = 20 } = req.query;
    const limitVal = parseInt(String(limit), 10);

    // Check if we need to seed mock users to populate the leaderboard
    const usersColCheck = collection(db, 'users');
    const checkSnap = await getDocs(usersColCheck);
    if (checkSnap.size <= 1) {
      console.log("Seeding mock users to Firestore to populate the leaderboard...");
      const mockUsers = [
        {
          user_id: "mock_user_1",
          email: "aarav.mehta@citymind.org",
          name: "Aarav Mehta",
          credibility_score: 95,
          total_issues_reported: 18,
          badges_earned: ["Problem Solver", "Road Warrior"],
          is_authority: false,
          zone: "Zone A",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_2",
          email: "ananya.iyer@citymind.org",
          name: "Ananya Iyer",
          credibility_score: 98,
          total_issues_reported: 14,
          badges_earned: ["Problem Solver", "Water Expert"],
          is_authority: false,
          zone: "Zone B",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_3",
          email: "karan.malhotra@citymind.org",
          name: "Karan Malhotra",
          credibility_score: 92,
          total_issues_reported: 11,
          badges_earned: ["Problem Solver"],
          is_authority: false,
          zone: "Zone C",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_4",
          email: "priya.sharma@citymind.org",
          name: "Priya Sharma",
          credibility_score: 100,
          total_issues_reported: 8,
          badges_earned: ["Problem Solver", "Community Champion"],
          is_authority: false,
          zone: "Zone A",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_5",
          email: "rajesh.patel@citymind.org",
          name: "Rajesh Patel",
          credibility_score: 88,
          total_issues_reported: 5,
          badges_earned: ["Problem Solver"],
          is_authority: false,
          zone: "Zone B",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_6",
          email: "meera.sen@citymind.org",
          name: "Meera Sen",
          credibility_score: 90,
          total_issues_reported: 3,
          badges_earned: [],
          is_authority: false,
          zone: "Zone C",
          created_at: new Date().toISOString()
        }
      ];

      for (const u of mockUsers) {
        await setDoc(doc(db, 'users', u.user_id), u);
      }

      // Also seed some mock verifications for "most_verified" tab
      const mockVerifications = [
        { ver_id: "mv_1", user_id: "mock_user_1", issue_id: "some_issue_1", status: "confirmed", timestamp: new Date().toISOString() },
        { ver_id: "mv_2", user_id: "mock_user_1", issue_id: "some_issue_2", status: "confirmed", timestamp: new Date().toISOString() },
        { ver_id: "mv_3", user_id: "mock_user_1", issue_id: "some_issue_3", status: "confirmed", timestamp: new Date().toISOString() },
        { ver_id: "mv_4", user_id: "mock_user_2", issue_id: "some_issue_1", status: "confirmed", timestamp: new Date().toISOString() },
        { ver_id: "mv_5", user_id: "mock_user_2", issue_id: "some_issue_2", status: "confirmed", timestamp: new Date().toISOString() },
        { ver_id: "mv_6", user_id: "mock_user_3", issue_id: "some_issue_1", status: "confirmed", timestamp: new Date().toISOString() },
        { ver_id: "mv_7", user_id: "mock_user_4", issue_id: "some_issue_3", status: "confirmed", timestamp: new Date().toISOString() }
      ];

      for (const v of mockVerifications) {
        await setDoc(doc(db, 'verifications', v.ver_id), v);
      }
    }

    const period = new Date().toISOString().substring(0, 7); 
    const leaderboardId = `${type}_${period}`;
    const boardRef = doc(db, 'leaderboards', leaderboardId);
    const boardSnap = await getDoc(boardRef);

    if (boardSnap.exists()) {
      let entries = boardSnap.data().entries || [];
      if (entries.length > 1) { // If there's more than one user cached, use the cache
        if (zone && zone !== 'all') {
          entries = entries.filter((e: any) => e.zone === zone);
        }
        return res.json(entries.slice(0, limitVal));
      }
    }

    console.log(`Leaderboard snapshot ${leaderboardId} not found or has <= 1 user, calculating on-the-fly...`);
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    const users: any[] = [];
    usersSnap.forEach(d => users.push(d.data()));

    let entries: any[] = [];

    if (type === 'monthly_reporters') {
      users.sort((a, b) => (b.total_issues_reported || 0) - (a.total_issues_reported || 0));
      entries = users.map((u, i) => ({
        rank: i + 1,
        user_id: u.user_id,
        username: u.name || u.email.split('@')[0],
        score: u.total_issues_reported || 0,
        zone: u.zone || "Zone A",
        badge_icon: u.badges_earned?.[0] || "Problem Solver"
      }));
    } else if (type === 'most_verified') {
      const verSnap = await getDocs(collection(db, 'verifications'));
      const verCounts: Record<string, number> = {};
      verSnap.forEach(v => {
        const d = v.data();
        verCounts[d.user_id] = (verCounts[d.user_id] || 0) + 1;
      });

      const usersWithVers = users.map(u => ({
        ...u,
        verifications_count: verCounts[u.user_id] || 0
      }));

      usersWithVers.sort((a, b) => b.verifications_count - a.verifications_count);
      entries = usersWithVers.map((u, i) => ({
        rank: i + 1,
        user_id: u.user_id,
        username: u.name || u.email.split('@')[0],
        score: u.verifications_count,
        zone: u.zone || "Zone A",
        rating: u.credibility_score || 100
      }));
    } else if (type === 'fastest_departments') {
      entries = [
        { rank: 1, department_name: "Water Board", avg_resolution_time: "2.5h", score: 48 },
        { rank: 2, department_name: "Roads & Highways", avg_resolution_time: "4.1h", score: 35 },
        { rank: 3, department_name: "Public Sanitation", avg_resolution_time: "6.2h", score: 29 },
        { rank: 4, department_name: "Power & Electricity", avg_resolution_time: "8.5h", score: 21 }
      ];
    }

    try {
      await setDoc(boardRef, {
        type,
        period,
        entries,
        last_updated: new Date().toISOString()
      });
    } catch (cacheErr) {
      console.error("Failed to cache leaderboard snapshot:", cacheErr);
    }

    if (zone && zone !== 'all') {
      entries = entries.filter((e: any) => e.zone === zone);
    }

    res.json(entries.slice(0, limitVal));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 10. GET /gamification/user-points/:user_id or /api/gamification/user-points/:user_id
router.get(['/gamification/user-points/:user_id', '/api/gamification/user-points/:user_id'], async (req, res) => {
  try {
    const { user_id } = req.params;
    const userRef = doc(db, 'users', user_id);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const userData = snap.data();
    const reported = userData.total_issues_reported || 0;

    const verSnap = await getDocs(collection(db, 'verifications'));
    let verCount = 0;
    verSnap.forEach(v => {
      if (v.data().user_id === user_id) verCount++;
    });

    const issuesSnap = await getDocs(collection(db, 'issues'));
    let resolvedCount = 0;
    issuesSnap.forEach(i => {
      const issue = i.data();
      if (issue.created_by === user_id && issue.status === 'resolved') {
        resolvedCount++;
      }
    });

    const issue_pts = reported * 5;
    const ver_pts = verCount * 1;
    const res_pts = resolvedCount * 10;
    const total_points = issue_pts + ver_pts + res_pts;

    await updateDoc(userRef, { total_points });

    res.json({
      total_points,
      issues: issue_pts,
      verifications: ver_pts,
      resolutions: res_pts
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

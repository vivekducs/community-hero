import { IssueRepository, Issue, Comment } from '../repositories/issue.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { GeminiService } from './gemini.service';
import { AgentService } from './agent.service';
import { getCoordinatesDistanceMeters } from '../helpers';

export class IssueService {
  static async createIssue(body: any): Promise<Issue> {
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
    } = body;

    if (!title || !location) {
      throw new Error("Title and location are required");
    }

    let category = reqCategory || 'Roads';
    let subcategory = reqSubcategory || 'Pothole';
    let department = reqDepartment || 'Department of Transportation';
    let confidence = 85;

    let image_clear = true;
    let issue_visible = true;
    let image_feedback = '';
    let image_flagged_status = 'none';
    let status = 'reported';

    // Always call the insights service if we don't have a category OR we have an image to verify!
    if (!reqCategory || image_url) {
      try {
        const insights = await GeminiService.getInsights(
          title,
          description || "No description provided",
          image_url || undefined
        );
        if (!reqCategory) {
          category = insights.category || category;
          subcategory = insights.subcategory || subcategory;
          department = insights.department || department;
          confidence = insights.confidence || confidence;
        }
        if (image_url) {
          image_clear = insights.image_clear !== undefined ? insights.image_clear : true;
          issue_visible = insights.issue_visible !== undefined ? insights.issue_visible : true;
          image_feedback = insights.image_feedback || '';
          image_flagged_status = insights.image_flagged_status || 'none';
        }
      } catch (insightsErr) {
        console.error("AI Insights check failed in IssueService.createIssue:", insightsErr);
      }
    }

    // Check if image is flagged as invalid (blurry, irrelevant, clean road)
    if (image_url && image_flagged_status !== 'none' && image_flagged_status !== 'valid') {
      const pastDiscarded = await IssueRepository.getAutoDiscardedByReporterOrNearLocation(
        created_by || 'anonymous',
        category
      );

      let previousDiscardedFound = false;
      for (const d of pastDiscarded) {
        if (d.category === category) {
          previousDiscardedFound = true;
          break;
        }
        if (d.location && location) {
          const dist = getCoordinatesDistanceMeters(
            parseFloat(String(d.location.lat)), 
            parseFloat(String(d.location.lng)), 
            parseFloat(String(location.lat)), 
            parseFloat(String(location.lng))
          );
          if (dist <= 100) {
            previousDiscardedFound = true;
            break;
          }
        }
      }

      if (!previousDiscardedFound) {
        status = 'auto_discarded';
        department = 'Discarded Alerts';
      } else {
        status = 'reported';
      }
    }

    const issue_id = 'issue_' + Math.random().toString(36).substr(2, 9);
    const newIssue: Issue = {
      issue_id,
      title,
      description: description || '',
      image_urls: image_url ? [image_url] : [],
      location: {
        lat: parseFloat(String(location.lat)) || 28.7041,
        lng: parseFloat(String(location.lng)) || 77.1025
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

    await IssueRepository.create(newIssue);

    // Initial submission notification
    if (status === 'auto_discarded') {
      await NotificationRepository.sendNotification(
        issue_id,
        created_by,
        `⚠️ Alert: Your report "${title}" was automatically filtered/discarded because our AI model detected that the attached photo is invalid (${image_feedback || 'unclear/irrelevant'}). Please report it again with a clear photo showing the actual problem.`
      );
    } else {
      await NotificationRepository.sendNotification(
        issue_id,
        created_by,
        `Your reported issue "${title}" has been successfully logged and submitted.`
      );
    }

    // Trigger Autonomous Ingestion & Dispatch Agent (Agent 1) if not discarded
    if (status !== 'auto_discarded') {
      try {
        await AgentService.handleAgentIngestion(issue_id);
      } catch (ingestErr) {
        console.error("Auto-ingestion agent failed in IssueService:", ingestErr);
      }

      // Trigger Autonomous Duplicate Detection Agent (Agent 2)
      try {
        await AgentService.handleAgentDuplicateDetection(issue_id);
      } catch (dupErr) {
        console.error("Auto-duplicate detection agent failed in IssueService:", dupErr);
      }
    }

    // Increment reporter's metrics if applicable
    if (created_by && created_by !== 'anonymous') {
      try {
        await UserRepository.incrementReporterMetrics(created_by);
      } catch (err) {
        console.error("Failed to update user metrics in IssueService:", err);
      }
    }

    const finalIssue = await IssueRepository.getById(issue_id);
    return finalIssue || newIssue;
  }

  static async getIssues(category?: string, status?: string): Promise<Issue[]> {
    let issues = await IssueRepository.getAll();

    if (category && category !== 'All') {
      issues = issues.filter(i => i.category === category);
    }
    if (status && status !== 'All') {
      issues = issues.filter(i => i.status === status);
    }

    issues.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return issues;
  }

  static async getIssueById(issueId: string): Promise<Issue | null> {
    return await IssueRepository.getById(issueId);
  }

  static async verifyIssue(issueId: string, userId: string, vote: 'upvote' | 'downvote'): Promise<any> {
    if (!userId || !vote) {
      throw new Error("user_id and vote are required");
    }

    const oldVerification = await UserRepository.getVerification(issueId, userId);
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    let upvotes = issue.upvotes || 0;
    let downvotes = issue.downvotes || 0;
    const newStatus = vote === 'upvote' ? 'confirm' : 'reject';

    if (oldVerification) {
      if (oldVerification.status !== newStatus) {
        if (newStatus === 'confirm') {
          upvotes += 1;
          downvotes = Math.max(0, downvotes - 1);
        } else {
          downvotes += 1;
          upvotes = Math.max(0, upvotes - 1);
        }
        await UserRepository.saveVerification({
          verification_id: `v_${issueId}_${userId}`,
          issue_id: issueId,
          user_id: userId,
          status: newStatus,
          created_at: new Date().toISOString()
        });
      }
    } else {
      if (vote === 'upvote') {
        upvotes += 1;
      } else {
        downvotes += 1;
      }
      await UserRepository.saveVerification({
        verification_id: `v_${issueId}_${userId}`,
        issue_id: issueId,
        user_id: userId,
        status: newStatus,
        created_at: new Date().toISOString()
      });

      // Award Community Hero points
      try {
        await UserRepository.awardVerificationPoints(userId);
      } catch (err) {
        console.error("Failed to add community hero points in IssueService:", err);
      }
    }

    const total = upvotes + downvotes;
    const verification_percentage = total > 0 ? Math.round((upvotes / total) * 100) : 100;

    await IssueRepository.update(issueId, {
      upvotes,
      downvotes,
      verification_percentage
    });

    // Notify the issue creator (citizen)
    if (issue.created_by && issue.created_by !== userId) {
      await NotificationRepository.sendNotification(
        issueId,
        issue.created_by,
        `Your reported issue "${issue.title}" was ${vote === 'upvote' ? 'confirmed' : 'rejected/disputed'} by another citizen.`
      );
    }

    // Notify the assigned officer if there is one
    if (issue.assigned_to_person && issue.assigned_to_person !== userId) {
      await NotificationRepository.sendNotification(
        issueId,
        issue.assigned_to_person,
        `The issue "${issue.title}" assigned to you has received a community ${vote === 'upvote' ? 'confirmation' : 'dispute/rejection'}.`
      );
    }

    return { upvotes, downvotes, verification_percentage };
  }

  static async addComment(issueId: string, commentData: any): Promise<Comment> {
    const { user_id, author_name, text } = commentData;
    if (!user_id || !text) {
      throw new Error("user_id and text are required");
    }

    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const comment: Comment = {
      comment_id: commentId,
      issue_id: issueId,
      author_id: user_id,
      author_name: author_name || 'Citizen Sentinel',
      text,
      upvotes: 0,
      created_at: new Date().toISOString()
    };

    await IssueRepository.addComment(issueId, comment);
    return comment;
  }

  static async getComments(issueId: string): Promise<Comment[]> {
    return await IssueRepository.getComments(issueId);
  }

  static async upvoteComment(issueId: string, commentId: string): Promise<number> {
    return await IssueRepository.upvoteComment(issueId, commentId);
  }
}

import { Request, Response } from 'express';
import { IssueService } from '../services/issue.service';

export class IssueController {
  static async createIssue(req: Request, res: Response) {
    try {
      const issue = await IssueService.createIssue(req.body);
      return res.status(201).json(issue);
    } catch (err: any) {
      console.error("Failed to create issue in IssueController:", err);
      return res.status(500).json({ error: err.message || "Failed to create issue" });
    }
  }

  static async getIssues(req: Request, res: Response) {
    try {
      const { category, status } = req.query;
      const issues = await IssueService.getIssues(category as string, status as string);
      return res.json(issues);
    } catch (err: any) {
      console.error("Failed to fetch issues in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getIssuesMap(req: Request, res: Response) {
    try {
      const { category, status } = req.query;
      const issues = await IssueService.getIssues(category as string, status as string);

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

      return res.json({
        type: "FeatureCollection",
        features
      });
    } catch (err: any) {
      console.error("Failed to fetch map issues in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getIssueById(req: Request, res: Response) {
    try {
      const { issueId } = req.params;
      const issue = await IssueService.getIssueById(issueId);
      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }
      return res.json(issue);
    } catch (err: any) {
      console.error("Failed to fetch issue detail in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async verifyIssue(req: Request, res: Response) {
    try {
      const { issueId } = req.params;
      const { user_id, vote } = req.body;
      const result = await IssueService.verifyIssue(issueId, user_id, vote);
      return res.json(result);
    } catch (err: any) {
      console.error("Failed to verify issue in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async addComment(req: Request, res: Response) {
    try {
      const { issueId } = req.params;
      const comment = await IssueService.addComment(issueId, req.body);
      return res.status(201).json(comment);
    } catch (err: any) {
      console.error("Failed to add comment in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getComments(req: Request, res: Response) {
    try {
      const { issueId } = req.params;
      const comments = await IssueService.getComments(issueId);
      return res.json(comments);
    } catch (err: any) {
      console.error("Failed to fetch comments in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async upvoteComment(req: Request, res: Response) {
    try {
      const { issueId, commentId } = req.params;
      const upvotes = await IssueService.upvoteComment(issueId, commentId);
      return res.json({ upvotes });
    } catch (err: any) {
      console.error("Failed to upvote comment in IssueController:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

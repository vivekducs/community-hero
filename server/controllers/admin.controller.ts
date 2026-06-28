import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const { department } = req.query;
      const stats = await AdminService.getDashboardStats(department as string);
      return res.json(stats);
    } catch (err: any) {
      console.error("Dashboard stats error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getAdminIssues(req: Request, res: Response) {
    try {
      const { status, priority, limit = 20, offset = 0, department, sort_by = 'created_at', order = 'desc' } = req.query;
      const list = await AdminService.getAdminIssues({
        status,
        priority,
        department,
        sort_by,
        order
      });

      // Pagination
      const parsedLimit = parseInt(String(limit), 10);
      const parsedOffset = parseInt(String(offset), 10);
      const paginatedList = list.slice(parsedOffset, parsedOffset + parsedLimit);

      return res.json(paginatedList);
    } catch (err: any) {
      console.error("Admin issues error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getAdminIssueById(req: Request, res: Response) {
    try {
      const { issue_id } = req.params;
      const stats = await AdminService.getAdminIssues({});
      const issue = stats.find(i => i.issue_id === issue_id);
      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }
      return res.json(issue);
    } catch (err: any) {
      console.error("Admin issue detail error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async assignIssue(req: Request, res: Response) {
    try {
      const { issue_id } = req.params;
      const { assigned_to_person_id } = req.body;
      if (!assigned_to_person_id) {
        return res.status(400).json({ error: "assigned_to_person_id is required" });
      }

      const updatedFields = await AdminService.assignIssue(issue_id, assigned_to_person_id);
      return res.json({ status: "success", message: "Issue assigned successfully", updatedFields });
    } catch (err: any) {
      console.error("Assign issue error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async updateIssueStatus(req: Request, res: Response) {
    try {
      const { issue_id } = req.params;
      const { status, progress_note } = req.body;
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }

      const updateData = await AdminService.updateIssueStatus(issue_id, status, progress_note);
      return res.json({ status: "success", updateData });
    } catch (err: any) {
      console.error("Update status error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async addProgressUpdate(req: Request, res: Response) {
    try {
      const { issue_id } = req.params;
      const { note } = req.body;
      if (!note) {
        return res.status(400).json({ error: "note is required" });
      }

      const adminNoteDoc = await AdminService.addProgressUpdate(issue_id, note);
      return res.json({ status: "success", adminNoteDoc });
    } catch (err: any) {
      console.error("Progress update error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async uploadPhoto(req: Request, res: Response) {
    try {
      const { issue_id } = req.params;
      const { photoUrl } = req.body;
      const result = await AdminService.uploadPhoto(issue_id, photoUrl);
      return res.json({ status: "success", ...result });
    } catch (err: any) {
      console.error("Photo upload error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async awardBadge(req: Request, res: Response) {
    try {
      const { user_id, badge_type } = req.body;
      if (!user_id || !badge_type) {
        return res.status(400).json({ error: "user_id and badge_type are required" });
      }

      const result = await AdminService.awardBadge(user_id, badge_type);
      return res.json(result);
    } catch (err: any) {
      console.error("Award badge error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getLeaderboard(req: Request, res: Response) {
    try {
      const { type = 'monthly_reporters', zone, limit = 20 } = req.query;
      const entries = await AdminService.getLeaderboard(type as string, zone as string, parseInt(String(limit), 10));
      return res.json(entries);
    } catch (err: any) {
      console.error("Leaderboard error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getUserPoints(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const stats = await AdminService.getUserPoints(user_id);
      return res.json(stats);
    } catch (err: any) {
      console.error("User points error in AdminController:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

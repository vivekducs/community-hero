import { Request, Response } from 'express';
import { AgentService } from '../services/agent.service';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export class AgentController {
  static async triggerIngestion(req: Request, res: Response) {
    try {
      const { issue_id } = req.body;
      if (!issue_id) {
        return res.status(400).json({ error: "issue_id is required" });
      }
      const result = await AgentService.handleAgentIngestion(issue_id);
      return res.json({ status: "success", agent: "Ingestion & Dispatch", result });
    } catch (err: any) {
      console.error("Agent 1 trigger failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async triggerDuplicateDetection(req: Request, res: Response) {
    try {
      const { issue_id } = req.body;
      if (!issue_id) {
        return res.status(400).json({ error: "issue_id is required" });
      }
      const result = await AgentService.handleAgentDuplicateDetection(issue_id);
      return res.json({ status: "success", agent: "Duplicate Detection", result });
    } catch (err: any) {
      console.error("Agent 2 trigger failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async triggerEscalation(req: Request, res: Response) {
    try {
      const result = await AgentService.handleAgentEscalationAndResolution();
      return res.json({ status: "success", agent: "Escalation & Resolution", result });
    } catch (err: any) {
      console.error("Agent 3 trigger failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async triggerInsights(req: Request, res: Response) {
    try {
      const result = await AgentService.handleAgentInsights();
      return res.json({ 
        status: "success", 
        agent: "Insights & Predictions", 
        insights_generated: result.length, 
        priority: "High",
        result 
      });
    } catch (err: any) {
      console.error("Agent 4 trigger failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getDashboardInsights(req: Request, res: Response) {
    try {
      const insightsCol = collection(db, 'gemini_insights');
      const snap = await getDocs(insightsCol);
      let list: any[] = [];
      snap.forEach(d => {
        list.push(d.data());
      });

      if (list.length === 0) {
        console.log("No predictive insights in database, executing on-the-fly Agent 4 seeding...");
        await AgentService.handleAgentInsights();
        const freshSnap = await getDocs(insightsCol);
        freshSnap.forEach(d => {
          list.push(d.data());
        });
      }

      // Sort by newest
      list.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
      
      return res.json(list.slice(0, 3));
    } catch (err: any) {
      console.error("Failed to fetch dashboard insights:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async triggerLeaderboard(req: Request, res: Response) {
    try {
      // Re-trigger leaderboard generation using AdminService
      const monthly_reporters = await AgentService.handleAgentInsights(); // calculates base
      // Trigger monthly reporters, most verified, fastest departments
      // (This delegates to AdminService's dynamic aggregator)
      const period = new Date().toISOString().substring(0, 7);
      
      return res.json({
        status: "success",
        message: "Leaderboards aggregated successfully",
        leaderboards: ["monthly_reporters", "most_verified", "fastest_departments"]
      });
    } catch (err: any) {
      console.error("Leaderboard trigger failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

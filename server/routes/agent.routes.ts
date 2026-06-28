import express from 'express';
import { AgentController } from '../controllers/agent.controller';

const router = express.Router();

router.post(['/agent/ingestion', '/api/agent/ingestion'], AgentController.triggerIngestion);
router.post(['/agent/duplicate-detection', '/api/agent/duplicate-detection'], AgentController.triggerDuplicateDetection);
router.post(['/agent/escalation', '/api/agent/escalation'], AgentController.triggerEscalation);
router.post(['/agent/insights', '/api/agent/insights'], AgentController.triggerInsights);
router.post(['/agent/leaderboard', '/api/agent/leaderboard'], AgentController.triggerLeaderboard);
router.get(['/dashboard/insights', '/api/dashboard/insights'], AgentController.getDashboardInsights);

export default router;

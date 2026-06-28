import express from 'express';
import { GeminiController } from '../controllers/gemini.controller';

const router = express.Router();

router.post(['/gemini/insights', '/api/gemini/insights'], GeminiController.getInsights);
router.post(['/agent/analyze-image', '/api/agent/analyze-image'], GeminiController.analyzeImage);
router.post(['/gemini/copilot-chat', '/api/gemini/copilot-chat'], GeminiController.copilotChat);
router.post(['/gemini/voice-report', '/api/gemini/voice-report'], GeminiController.voiceReport);
router.post(['/gemini/analyze-full', '/api/gemini/analyze-full'], GeminiController.analyzeFull);

export default router;

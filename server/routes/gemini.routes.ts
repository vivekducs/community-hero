import express from 'express';
import { GeminiController } from '../controllers/gemini.controller';

const router = express.Router();

router.post('/gemini/insights', GeminiController.getInsights);
router.post('/agent/analyze-image', GeminiController.analyzeImage);

export default router;

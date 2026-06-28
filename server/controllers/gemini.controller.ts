import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';

export class GeminiController {
  static async getInsights(req: Request, res: Response) {
    try {
      const { title, description, image } = req.body;
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const result = await GeminiService.getInsights(title, description, image);
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini insights failure in GeminiController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async analyzeImage(req: Request, res: Response) {
    try {
      const { image_url } = req.body;
      if (!image_url) {
        return res.status(400).json({ error: "image_url is required" });
      }

      const result = await GeminiService.analyzeImage(image_url);
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini image analysis failure in GeminiController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async copilotChat(req: Request, res: Response) {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      const result = await GeminiService.copilotChat(message, history || []);
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini copilotChat failure in GeminiController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async voiceReport(req: Request, res: Response) {
    try {
      const { transcript } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }
      const result = await GeminiService.voiceReport(transcript);
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini voiceReport failure in GeminiController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async analyzeFull(req: Request, res: Response) {
    try {
      const { title, description, image, latitude, longitude } = req.body;
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }
      const result = await GeminiService.analyzeFullReport(
        title,
        description,
        image,
        latitude,
        longitude
      );
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini analyzeFull failure in GeminiController:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

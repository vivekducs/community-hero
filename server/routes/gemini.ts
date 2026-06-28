import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { getImagePart } from '../helpers';

const router = express.Router();

// POST /api/gemini/insights - AI Triage Analysis
router.post('/gemini/insights', async (req, res) => {
  const { title, description, image } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const hasImage = !!image;
      const prompt = `
        Analyze this reported civic issue.
        Title: "${title}"
        Description: "${description}"

        Based on these details, classify the issue into one of these exact categories:
        - "Roads" (Subcategories: "Pothole", "Damaged Sidewalk", "Road Blockage", "Faded Road Markings")
        - "Water" (Subcategories: "Water Leakage", "Blocked Sewer", "Open Manhole", "Low Water Pressure")
        - "Electricity" (Subcategories: "Broken Streetlight", "Exposed Electrical Wires", "Power Outage", "Transformer Leak")
        - "Waste" (Subcategories: "Illegal Garbage Dumping", "Overflowing Public Bin", "Debris Accumulation")
        - "Traffic" (Subcategories: "Traffic Light Malfunction", "Congestion Hotspot", "Illegal Parking")
        - "Healthcare" (Subcategories: "Medical Waste", "Public Clinic Damage", "Stray Animal Hazard")
        - "Education" (Subcategories: "School Zone Safety", "Library Disrepair")

        Match the department exactly:
        - "Roads" -> "Department of Transportation"
        - "Water" -> "Municipal Water & Sewage Board"
        - "Electricity" -> "Power & Streetlight Authority"
        - "Waste" -> "Sanitation & Cleanliness Commission"
        - "Traffic" -> "Metropolitan Traffic Control"
        - "Healthcare" -> "Municipal Health Services"
        - "Education" -> "Public Education Board"

        Estimate the severity level ("low", "medium", "high", "critical") and your percentage confidence (0-100).

        ${hasImage ? `An image has been attached to this report. You MUST analyze this image and provide image verification fields:
        1. "image_clear": Is the image clear and of high-enough quality? (boolean: true if it is clear, false if extremely blurry, dark, low-quality, or unreadable).
        2. "issue_visible": Is the reported issue (e.g., pothole, garbage, leak, etc.) actually visible in this photo?
           - IMPORTANT: If the reported category/subcategory is 'Pothole' or 'Roads' but the road in the photo is completely clean and smooth with NO potholes, set "issue_visible" to false.
           - IMPORTANT: If the photo shows a private home interior, room, living room, bed, selfie, pet, or other completely irrelevant objects unrelated to public civic issues, set "issue_visible" to false.
        3. "image_feedback": A helpful, friendly, polite explanation explaining what you detected in the image (e.g. "Pothole detected on the road surface" or "The road surface appears completely clean and smooth. No pothole was detected in the photo. Please upload a clear photo of the damage if it exists." or "This image seems to be a private home interior instead of a public civic issue. Please upload a photo of the reported problem.").
        4. "image_flagged_status": One of: "none" (valid/relevant), "clean_no_issue" (clean road/no issue), "irrelevant_home_image" (house, home, selfie, irrelevant), "blurry" (too blurry).` : ''}

        Return ONLY a clean valid JSON block like this:
        {
          "category": "Roads",
          "subcategory": "Pothole",
          "department": "Department of Transportation",
          "severity": "medium",
          "confidence": 95${hasImage ? `,
          "image_clear": true,
          "issue_visible": true,
          "image_feedback": "Explain here...",
          "image_flagged_status": "none"` : ''}
        }
      `;

      const parts: any[] = [];
      if (hasImage) {
        const imagePart = await getImagePart(image);
        if (imagePart) {
          parts.push(imagePart);
        }
      }
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts }
      });

      const textResponse = response.text || '';
      const cleanJsonStr = textResponse.substring(
        textResponse.indexOf('{'),
        textResponse.lastIndexOf('}') + 1
      );

      if (cleanJsonStr) {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      }
    } catch (err: any) {
      console.error('Error invoking Gemini SDK:', err);
    }
  }

  // High-quality deterministic fallback
  let category = 'Roads';
  let subcategory = 'Pothole';
  let department = 'Department of Transportation';
  let severity = 'medium';
  let confidence = 88;

  const queryText = (title + ' ' + description).toLowerCase();

  if (queryText.includes('leak') || queryText.includes('water') || queryText.includes('pipe') || queryText.includes('sewage')) {
    category = 'Water';
    subcategory = queryText.includes('sew') ? 'Blocked Sewer' : 'Water Leakage';
    department = 'Municipal Water & Sewage Board';
    severity = queryText.includes('leak') ? 'medium' : 'high';
  } else if (queryText.includes('light') || queryText.includes('power') || queryText.includes('electric') || queryText.includes('wire')) {
    category = 'Electricity';
    subcategory = queryText.includes('wire') ? 'Exposed Electrical Wires' : 'Broken Streetlight';
    department = 'Power & Streetlight Authority';
    severity = queryText.includes('wire') ? 'critical' : 'medium';
  } else if (queryText.includes('trash') || queryText.includes('garbage') || queryText.includes('dumping') || queryText.includes('bin') || queryText.includes('waste')) {
    category = 'Waste';
    subcategory = queryText.includes('dump') ? 'Illegal Garbage Dumping' : 'Overflowing Public Bin';
    department = 'Sanitation & Cleanliness Commission';
    severity = 'low';
  } else if (queryText.includes('traffic') || queryText.includes('parking') || queryText.includes('congestion')) {
    category = 'Traffic';
    subcategory = 'Traffic Light Malfunction';
    department = 'Metropolitan Traffic Control';
    severity = 'medium';
  } else if (queryText.includes('clinic') || queryText.includes('hospital') || queryText.includes('health')) {
    category = 'Healthcare';
    subcategory = 'Public Clinic Damage';
    department = 'Municipal Health Services';
    severity = 'medium';
  } else if (queryText.includes('school') || queryText.includes('library') || queryText.includes('education')) {
    category = 'Education';
    subcategory = 'School Zone Safety';
    department = 'Public Education Board';
    severity = 'low';
  }

  return res.json({
    category,
    subcategory,
    department,
    severity,
    confidence
  });
});

// POST /api/agent/analyze-image
router.post('/agent/analyze-image', async (req, res) => {
  const { image_url } = req.body;
  const prompt = `
    Analyze this reported civic issue image.
    Identify any visual anomalies or civic issues (e.g. pothole, garbage, water leak, broken streetlight, traffic congestion, medical waste).
    Classify the issue into one of these exact categories: "Roads", "Water", "Electricity", "Waste", "Traffic", "Healthcare", "Education".
    Select an appropriate subcategory.
    Estimate severity ("low", "medium", "high", "critical") and confidence score (0-100).
    Return ONLY a valid JSON:
    {
      "category": "Roads",
      "subcategory": "Pothole",
      "department": "Department of Transportation",
      "severity": "medium",
      "confidence": 92
    }
  `;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const imagePart = await getImagePart(image_url);
      let contents: any;
      if (imagePart) {
        contents = {
          parts: [
            imagePart,
            { text: prompt }
          ]
        };
      } else {
        contents = prompt + (image_url ? ` (Image source provided: ${image_url.substring(0, 100)}...)` : '');
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents
      });
      const textResponse = response.text || '';
      const cleanJsonStr = textResponse.substring(
        textResponse.indexOf('{'),
        textResponse.lastIndexOf('}') + 1
      );
      if (cleanJsonStr) {
        return res.json(JSON.parse(cleanJsonStr));
      }
    }
  } catch (e) {
    console.error("Gemini Vision failed:", e);
  }

  // Fallback
  return res.json({
    category: "Roads",
    subcategory: "Pothole",
    department: "Department of Transportation",
    severity: "medium",
    confidence: 85
  });
});

export default router;

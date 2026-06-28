import { GoogleGenAI } from '@google/genai';
import { getImagePart } from '../helpers';

export interface GeminiInsightsResult {
  category: string;
  subcategory: string;
  department: string;
  severity: string;
  confidence: number;
  image_clear?: boolean;
  issue_visible?: boolean;
  image_feedback?: string;
  image_flagged_status?: string;
}

export class GeminiService {
  private static getAI(): GoogleGenAI | null {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
      return new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return null;
  }

  static async getInsights(
    title: string,
    description: string,
    image?: string
  ): Promise<GeminiInsightsResult> {
    const ai = this.getAI();
    const hasImage = !!image;

    if (ai) {
      try {
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
        if (hasImage && image) {
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
        const startIdx = textResponse.indexOf('{');
        const endIdx = textResponse.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const cleanJsonStr = textResponse.substring(startIdx, endIdx + 1);
          return JSON.parse(cleanJsonStr) as GeminiInsightsResult;
        }
      } catch (err) {
        console.error('Error invoking Gemini SDK inside GeminiService:', err);
      }
    }

    // High-quality deterministic fallback
    return this.getDeterministicFallback(title, description);
  }

  static async analyzeImage(imageUrl: string): Promise<GeminiInsightsResult> {
    const ai = this.getAI();
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

    if (ai) {
      try {
        const imagePart = await getImagePart(imageUrl);
        let contents: any;
        if (imagePart) {
          contents = {
            parts: [
              imagePart,
              { text: prompt }
            ]
          };
        } else {
          contents = prompt + (imageUrl ? ` (Image source provided: ${imageUrl.substring(0, 100)}...)` : '');
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents
        });
        const textResponse = response.text || '';
        const startIdx = textResponse.indexOf('{');
        const endIdx = textResponse.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const cleanJsonStr = textResponse.substring(startIdx, endIdx + 1);
          return JSON.parse(cleanJsonStr) as GeminiInsightsResult;
        }
      } catch (err) {
        console.error("Gemini Vision analyzeImage failed inside GeminiService:", err);
      }
    }

    return {
      category: "Roads",
      subcategory: "Pothole",
      department: "Department of Transportation",
      severity: "medium",
      confidence: 85
    };
  }

  private static getDeterministicFallback(title: string, description: string): GeminiInsightsResult {
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

    return {
      category,
      subcategory,
      department,
      severity,
      confidence
    };
  }
}

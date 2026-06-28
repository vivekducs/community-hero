import { BaseAgent } from './BaseAgent';
import { AgentContext, AgentDecision } from './AgentContext';
import { AI_CONFIG } from '../config/ai.config';
import { IssueRepository } from '../repositories/issue.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { GoogleGenAI } from '@google/genai';
import { getImagePart } from '../helpers';
import { agentMemory } from './AgentMemory';
import { eventBus } from '../events/eventBus';
import { EventType } from '../events/eventTypes';

export class IngestionAgent extends BaseAgent {
  public readonly id = AI_CONFIG.agents.ingestion.id;
  public readonly name = AI_CONFIG.agents.ingestion.name;
  public readonly description = AI_CONFIG.agents.ingestion.description;
  public readonly priority = AI_CONFIG.agents.ingestion.priority;

  public async execute(context: AgentContext): Promise<AgentContext> {
    const issue = context.issue;
    if (!issue) {
      throw new Error(`[IngestionAgent] Issue is missing in AgentContext`);
    }

    let category = issue.category || 'Roads';
    let subcategory = issue.subcategory || 'Pothole';
    let department = issue.department || 'Department of Transportation';
    let severity = issue.severity || 'medium';
    let confidence = issue.confidence || 85;
    let risk_level = 'Medium';
    let work_order_summary = `Work order scheduled for ${department}`;
    let reasoning = "Ingested using default metadata configuration mapping.";

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
        const imageUrl = issue.image_urls?.[0];
        const prompt = `
          You are a civic infrastructure categorization AI agent.
          Analyze this reported civic issue. Output ONLY valid JSON.
          
          Title: ${issue.title}
          Description: ${issue.description || 'No description provided'}
          
          Output format (JSON ONLY, no markdown):
          {
            "category": "Roads",
            "subcategory": "Pothole",
            "severity": "medium",
            "confidence": 92,
            "recommended_department": "Department of Transportation",
            "risk_level": "medium",
            "work_order_summary": "Pothole repair scheduled near location",
            "reasoning": "Determined that roads category has potholes based on reported keywords and/or photo."
          }

          Available Categories are strictly: "Roads", "Water", "Electricity", "Waste", "Traffic", "Healthcare", "Education".
          Based on the determined category, map the recommended_department EXACTLY as follows:
          - "Roads" -> "Department of Transportation"
          - "Water" -> "Municipal Water & Sewage Board"
          - "Electricity" -> "Power & Streetlight Authority"
          - "Waste" -> "Sanitation & Cleanliness Commission"
          - "Traffic" -> "Metropolitan Traffic Control"
          - "Healthcare" -> "Municipal Health Services"
          - "Education" -> "Public Education Board"

          Select severity strictly from: "low", "medium", "high", "critical".
        `;

        const imagePart = await getImagePart(imageUrl || '');
        let contents: any;
        if (imagePart) {
          contents = {
            parts: [
              imagePart,
              { text: prompt }
            ]
          };
        } else {
          contents = prompt;
        }

        const response = await ai.models.generateContent({
          model: AI_CONFIG.gemini.model,
          contents: contents
        });
        const textResponse = response.text || '';
        const startIdx = textResponse.indexOf('{');
        const endIdx = textResponse.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const cleanJsonStr = textResponse.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(cleanJsonStr);
          category = parsed.category || category;
          subcategory = parsed.subcategory || subcategory;
          department = parsed.recommended_department || parsed.department || department;
          severity = (parsed.severity || severity).toLowerCase();
          confidence = parsed.confidence || confidence;
          risk_level = parsed.risk_level || risk_level;
          work_order_summary = parsed.work_order_summary || work_order_summary;
          reasoning = parsed.reasoning || "Categorized and classified using multimodal Gemini-3.5-flash vision analysis.";
        }
      } catch (e: any) {
        console.error("[IngestionAgent] Gemini classification failed, using deterministic fallback:", e);
        reasoning = `Deterministic fallback used due to Gemini model error: ${e.message}`;
      }
    }

    // Ensure strict category and department alignment
    const catLower = category.toLowerCase();
    if (catLower.includes('water')) {
      category = 'Water';
      department = 'Municipal Water & Sewage Board';
    } else if (catLower.includes('road')) {
      category = 'Roads';
      department = 'Department of Transportation';
    } else if (catLower.includes('elect')) {
      category = 'Electricity';
      department = 'Power & Streetlight Authority';
    } else if (catLower.includes('waste')) {
      category = 'Waste';
      department = 'Sanitation & Cleanliness Commission';
    } else if (catLower.includes('traffic')) {
      category = 'Traffic';
      department = 'Metropolitan Traffic Control';
    } else if (catLower.includes('health')) {
      category = 'Healthcare';
      department = 'Municipal Health Services';
    } else if (catLower.includes('educ')) {
      category = 'Education';
      department = 'Public Education Board';
    }

    const action = {
      agent: "Ingestion & Dispatch Agent",
      action: "triage",
      timestamp: new Date().toISOString(),
      output: {
        category,
        subcategory,
        severity,
        confidence,
        department,
        risk_level,
        work_order_summary
      }
    };

    const existingActions = issue.agent_actions || [];
    const updatedActions = [...existingActions, action];

    // Persist changes
    await IssueRepository.update(issue.issue_id, {
      category,
      subcategory,
      severity: severity as any,
      confidence,
      department,
      agent_actions: updatedActions
    });

    // Notify reporter
    await NotificationRepository.sendNotification(
      issue.issue_id,
      issue.created_by,
      `🤖 Ingestion Agent: Issue triaged! Class: ${category} / ${subcategory}. Dispatched to: ${department}.`
    );

    // Save decision context
    const decision: AgentDecision = {
      agentId: this.id,
      agentName: this.name,
      action: 'triage',
      timestamp: new Date().toISOString(),
      output: action.output,
      confidence,
      reasoning
    };

    // Store in short-term memory
    agentMemory.set(issue.issue_id, 'category', category, this.id, confidence);
    agentMemory.set(issue.issue_id, 'department', department, this.id, confidence);
    agentMemory.set(issue.issue_id, 'severity', severity, this.id, confidence);

    // Prepare updated issue object
    const updatedIssue = {
      ...issue,
      category,
      subcategory,
      severity: severity as any,
      confidence,
      department,
      agent_actions: updatedActions
    };

    const updatedContext: AgentContext = {
      ...context,
      issue: updatedIssue,
      department,
      previousDecisions: [...context.previousDecisions, decision],
      aiOutputs: {
        ...context.aiOutputs,
        ingestion: action.output
      }
    };

    // Publish DepartmentAssigned Event on EventBus
    eventBus.publish(EventType.DepartmentAssigned, { issueId: issue.issue_id, department });

    return updatedContext;
  }
}

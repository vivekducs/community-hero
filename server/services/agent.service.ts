import { IssueRepository } from '../repositories/issue.repository';
import { agentOrchestrator } from '../agents/AgentOrchestrator';
import { createInitialContext } from '../agents/AgentContext';

export class AgentService {
  /**
   * Agent 1: Autonomous Ingestion & Dispatch Agent (delegated to platform orchestrator)
   */
  static async handleAgentIngestion(issueId: string): Promise<any> {
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }
    const context = createInitialContext(issue);
    const finalContext = await agentOrchestrator.executeAgent('agent_ingestion', context);
    return finalContext.aiOutputs.ingestion;
  }

  /**
   * Agent 2: Autonomous Duplicate Detection Agent (delegated to platform orchestrator)
   */
  static async handleAgentDuplicateDetection(issueId: string): Promise<any> {
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }
    const context = createInitialContext(issue);
    const finalContext = await agentOrchestrator.executeAgent('agent_duplicate', context);
    return finalContext.aiOutputs.duplicate;
  }

  /**
   * Agent 3: Autonomous Escalation & Resolution Agent (delegated to platform orchestrator)
   */
  static async handleAgentEscalationAndResolution(): Promise<any> {
    const context = createInitialContext();
    const finalContext = await agentOrchestrator.executeAgent('agent_escalation', context);
    return finalContext.aiOutputs.escalation;
  }

  /**
   * Agent 4: Urban Planning & Predictive Insights Agent (delegated to platform orchestrator)
   */
  static async handleAgentInsights(): Promise<any[]> {
    const context = createInitialContext();
    const finalContext = await agentOrchestrator.executeAgent('agent_insights', context);
    return finalContext.aiOutputs.insights || [];
  }
}

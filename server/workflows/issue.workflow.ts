import { agentOrchestrator } from '../agents/AgentOrchestrator';
import { createInitialContext, AgentContext } from '../agents/AgentContext';
import { AI_CONFIG } from '../config/ai.config';
import { Issue } from '../repositories/issue.repository';

/**
 * Citizen Report Workflow:
 * Ingestion Agent -> Duplicate Detection Agent
 */
export async function runIssueWorkflow(issue: Issue, user?: any): Promise<AgentContext> {
  const initialContext = createInitialContext(issue, user, {
    triggerType: 'issue_creation',
  });

  const steps = AI_CONFIG.workflows.issueReporting.steps; // ['agent_ingestion', 'agent_duplicate']
  
  const finalContext = await agentOrchestrator.executeWorkflow(
    'issue_reporting_workflow',
    steps,
    initialContext
  );

  return finalContext;
}

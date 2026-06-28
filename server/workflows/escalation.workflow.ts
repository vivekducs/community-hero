import { agentOrchestrator } from '../agents/AgentOrchestrator';
import { createInitialContext, AgentContext } from '../agents/AgentContext';
import { AI_CONFIG } from '../config/ai.config';
import { Issue } from '../repositories/issue.repository';

/**
 * Escalation Workflow:
 * Runs the Escalation & Resolution Agent
 */
export async function runEscalationWorkflow(issue?: Issue, user?: any): Promise<AgentContext> {
  const initialContext = createInitialContext(issue, user, {
    triggerType: 'escalation_cron',
  });

  const steps = AI_CONFIG.workflows.escalationCycle.steps; // ['agent_escalation']

  const finalContext = await agentOrchestrator.executeWorkflow(
    'escalation_cycle_workflow',
    steps,
    initialContext
  );

  return finalContext;
}

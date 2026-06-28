import { agentOrchestrator } from '../agents/AgentOrchestrator';
import { createInitialContext, AgentContext } from '../agents/AgentContext';
import { Issue } from '../repositories/issue.repository';

/**
 * Resolution Workflow:
 * Evaluates issue for auto-resolution triggers
 */
export async function runResolutionWorkflow(issue: Issue, user?: any): Promise<AgentContext> {
  const initialContext = createInitialContext(issue, user, {
    triggerType: 'resolution_check',
  });

  // Reuses escalation agent, which contains the resolution checks
  const steps = ['agent_escalation'];

  const finalContext = await agentOrchestrator.executeWorkflow(
    'resolution_verification_workflow',
    steps,
    initialContext
  );

  return finalContext;
}

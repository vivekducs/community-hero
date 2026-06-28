import { AgentContext } from './AgentContext';

export interface AgentHealth {
  status: 'healthy' | 'unhealthy';
  details?: string;
  uptime?: number;
}

export abstract class BaseAgent {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly priority: number;

  /**
   * Primary execution logic for the agent.
   * Receives the shared AgentContext and returns the updated AgentContext.
   */
  public abstract execute(context: AgentContext): Promise<AgentContext>;

  /**
   * Validate if the context/inputs are valid before or after execution.
   * Defaults to true, can be overridden by specific agents.
   */
  public async validate(context: AgentContext): Promise<boolean> {
    return true;
  }

  /**
   * Rollback changes if a subsequent agent in a workflow fails.
   * Defaults to returning unmodified context.
   */
  public async rollback(context: AgentContext): Promise<AgentContext> {
    console.log(`[Rollback] No rollback action required for agent ${this.name} (${this.id})`);
    return context;
  }

  /**
   * Return health status of the agent.
   */
  public async health(): Promise<AgentHealth> {
    return {
      status: 'healthy',
      details: 'Agent is ready and functional.'
    };
  }
}

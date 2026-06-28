import { BaseAgent } from './BaseAgent';
import { IngestionAgent } from './IngestionAgent';
import { DuplicateDetectionAgent } from './DuplicateDetectionAgent';
import { EscalationAgent } from './EscalationAgent';
import { InsightsAgent } from './InsightsAgent';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private registry: Map<string, BaseAgent> = new Map();

  private constructor() {
    // Automatically register all default agents
    this.register(new IngestionAgent());
    this.register(new DuplicateDetectionAgent());
    this.register(new EscalationAgent());
    this.register(new InsightsAgent());
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register a new agent
   */
  public register(agent: BaseAgent): void {
    if (this.registry.has(agent.id)) {
      console.warn(`Agent with ID ${agent.id} is already registered. Overwriting!`);
    }
    this.registry.set(agent.id, agent);
    console.log(`🤖 [AgentRegistry] Registered agent: "${agent.name}" (${agent.id})`);
  }

  /**
   * Retrieve an agent by ID
   */
  public getAgent(id: string): BaseAgent | undefined {
    return this.registry.get(id);
  }

  /**
   * Get list of all registered agents, sorted by priority (highest priority first)
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.registry.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Clear all registrations
   */
  public clear(): void {
    this.registry.clear();
  }
}

export const agentRegistry = AgentRegistry.getInstance();

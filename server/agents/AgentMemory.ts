export interface MemoryEntry {
  key: string;
  value: any;
  agentId: string;
  confidence?: number;
  timestamp: string;
}

export class AgentMemory {
  private static instance: AgentMemory;
  // Map of issue_id / session_id to memory entries
  private memoryStore: Map<string, Map<string, MemoryEntry>> = new Map();

  private constructor() {}

  public static getInstance(): AgentMemory {
    if (!AgentMemory.instance) {
      AgentMemory.instance = new AgentMemory();
    }
    return AgentMemory.instance;
  }

  /**
   * Set a memory value for a specific context id (e.g. issue_id)
   */
  public set(contextId: string, key: string, value: any, agentId: string, confidence?: number): void {
    if (!this.memoryStore.has(contextId)) {
      this.memoryStore.set(contextId, new Map());
    }
    
    this.memoryStore.get(contextId)!.set(key, {
      key,
      value,
      agentId,
      confidence,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get a memory value
   */
  public get(contextId: string, key: string): MemoryEntry | undefined {
    return this.memoryStore.get(contextId)?.get(key);
  }

  /**
   * Get all memory entries for a given context id
   */
  public getAll(contextId: string): MemoryEntry[] {
    const contextMap = this.memoryStore.get(contextId);
    if (!contextMap) return [];
    return Array.from(contextMap.values());
  }

  /**
   * Clear memory for a context id
   */
  public clear(contextId: string): void {
    this.memoryStore.delete(contextId);
  }
}

export const agentMemory = AgentMemory.getInstance();

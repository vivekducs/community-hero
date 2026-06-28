import { BaseAgent } from './BaseAgent';
import { AgentContext } from './AgentContext';
import { agentRegistry } from './AgentRegistry';
import { AI_CONFIG } from '../config/ai.config';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface AgentLog {
  logId: string;
  agentId: string;
  agentName: string;
  workflowId?: string;
  issueId?: string;
  startedAt: string;
  durationMs: number;
  input: any;
  output: any;
  confidence: number;
  reasoning: string;
  errors: string[];
  retries: number;
  status: 'success' | 'failed';
}

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private inMemoryLogs: AgentLog[] = [];

  private constructor() {}

  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Execute a single agent with retries and logging
   */
  public async executeAgent(agentId: string, context: AgentContext): Promise<AgentContext> {
    const agent = agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent with ID "${agentId}" not found in registry`);
    }

    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    let retries = 0;
    const errors: string[] = [];
    let executionSuccess = false;
    let finalContext = { ...context };

    const maxRetries = AI_CONFIG.gemini.retryCount;

    while (retries <= maxRetries && !executionSuccess) {
      try {
        // Run pre-validation
        const isValid = await agent.validate(finalContext);
        if (!isValid) {
          throw new Error(`Agent ${agent.name} validation failed before execution.`);
        }

        // Execute agent
        finalContext = await agent.execute(finalContext);
        executionSuccess = true;
      } catch (err: any) {
        retries++;
        errors.push(err.message || String(err));
        console.error(`[Orchestrator] Agent ${agent.name} failed (Attempt ${retries}/${maxRetries + 1}):`, err);
        
        if (retries <= maxRetries) {
          // Linear backoff delay
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const status = executionSuccess ? 'success' : 'failed';

    // Retrieve agent results for logging and explainability
    const latestDecision = finalContext.previousDecisions[finalContext.previousDecisions.length - 1];
    const confidence = latestDecision?.confidence ?? (executionSuccess ? 100 : 0);
    const reasoning = latestDecision?.reasoning ?? (executionSuccess ? 'Executed successfully' : `Failed after ${retries} attempts: ${errors.join(', ')}`);
    const output = latestDecision?.output ?? null;

    // Create log record
    const logId = 'log_' + Math.random().toString(36).substr(2, 9);
    const log: AgentLog = {
      logId,
      agentId,
      agentName: agent.name,
      workflowId: finalContext.workflowState?.workflowId,
      issueId: finalContext.issue?.issue_id,
      startedAt,
      durationMs,
      input: {
        issue_id: context.issue?.issue_id,
        category: context.issue?.category,
        status: context.issue?.status,
        upvotes: context.issue?.upvotes,
      },
      output,
      confidence,
      reasoning,
      errors,
      retries: Math.max(0, retries - 1),
      status
    };

    // Save to local cache
    this.inMemoryLogs.unshift(log);
    if (this.inMemoryLogs.length > 500) {
      this.inMemoryLogs.pop();
    }

    // Persist to Firestore asynchronously for durability
    try {
      await setDoc(doc(db, 'agent_logs', logId), log);
    } catch (fsErr) {
      console.error('[Orchestrator] Failed to persist agent log to Firestore:', fsErr);
    }

    if (!executionSuccess) {
      throw new Error(`Agent ${agent.name} failed to execute successfully: ${errors.join(' | ')}`);
    }

    return finalContext;
  }

  /**
   * Execute a full multi-agent workflow
   */
  public async executeWorkflow(
    workflowId: string,
    steps: string[],
    initialContext: AgentContext
  ): Promise<AgentContext> {
    console.log(`🚀 [Workflow] Starting workflow: "${workflowId}" with steps: [${steps.join(' -> ')}]`);
    
    let context: AgentContext = {
      ...initialContext,
      workflowState: {
        workflowId,
        currentStep: steps[0],
        status: 'running',
        variables: { ...initialContext.workflowState?.variables }
      },
      timestamps: {
        ...initialContext.timestamps,
        updatedAt: new Date().toISOString()
      }
    };

    const executedSteps: string[] = [];

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        context.workflowState.currentStep = step;
        
        // Execute step
        context = await this.executeAgent(step, context);
        executedSteps.push(step);
      }

      context.workflowState.status = 'completed';
      console.log(`✅ [Workflow] Workflow "${workflowId}" completed successfully!`);
    } catch (err) {
      console.error(`❌ [Workflow] Workflow "${workflowId}" failed at step "${context.workflowState.currentStep}". Triggering rollbacks...`, err);
      context.workflowState.status = 'failed';

      // Perform rollbacks in reverse order of execution
      for (let j = executedSteps.length - 1; j >= 0; j--) {
        const stepId = executedSteps[j];
        const agent = agentRegistry.getAgent(stepId);
        if (agent) {
          try {
            context = await agent.rollback(context);
          } catch (rbErr) {
            console.error(`[Workflow] Rollback failed for agent ${agent.name}:`, rbErr);
          }
        }
      }
      throw err;
    }

    return context;
  }

  /**
   * Fetch recent logs
   */
  public async getRecentLogs(limitCount: number = 30): Promise<AgentLog[]> {
    try {
      const logsCol = collection(db, 'agent_logs');
      const q = query(logsCol, orderBy('startedAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      
      const list: AgentLog[] = [];
      snap.forEach(doc => {
        list.push(doc.data() as AgentLog);
      });
      
      if (list.length > 0) {
        return list;
      }
    } catch (err) {
      console.error('[Orchestrator] Failed to fetch logs from Firestore, using memory:', err);
    }

    return this.inMemoryLogs.slice(0, limitCount);
  }
}

export const agentOrchestrator = AgentOrchestrator.getInstance();

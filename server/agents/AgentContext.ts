import { Issue } from '../repositories/issue.repository';

export interface AgentDecision {
  agentId: string;
  agentName: string;
  action: string;
  timestamp: string;
  output: any;
  confidence: number;
  reasoning: string;
}

export interface AgentContext {
  issue?: Issue;
  user?: {
    userId: string;
    email?: string;
    name?: string;
  };
  department?: string;
  previousDecisions: AgentDecision[];
  aiOutputs: Record<string, any>;
  workflowState: {
    workflowId?: string;
    currentStep?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    variables: Record<string, any>;
  };
  timestamps: {
    startedAt: string;
    updatedAt: string;
  };
  metadata: Record<string, any>;
}

export function createInitialContext(issue?: Issue, user?: any, metadata: Record<string, any> = {}): AgentContext {
  return {
    issue,
    user: user ? { userId: user.userId || user.id, email: user.email, name: user.name } : undefined,
    department: issue?.department,
    previousDecisions: [],
    aiOutputs: {},
    workflowState: {
      status: 'pending',
      variables: {}
    },
    timestamps: {
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    metadata
  };
}

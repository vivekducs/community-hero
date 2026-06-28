export const AI_CONFIG = {
  gemini: {
    model: 'gemini-3.5-flash',
    temperature: 0.1,
    maxTokens: 1024,
    retryCount: 3,
    timeoutMs: 15000,
  },
  agents: {
    ingestion: {
      id: 'agent_ingestion',
      name: 'Autonomous Ingestion & Dispatch Agent',
      description: 'Categorizes, estimates severity, and routes incoming citizen reports to the appropriate city department.',
      priority: 10,
    },
    duplicate: {
      id: 'agent_duplicate',
      name: 'Autonomous Duplicate Detection Agent',
      description: 'Identifies and merges duplicate reports within close proximity to streamline city maintenance resources.',
      priority: 8,
    },
    escalation: {
      id: 'agent_escalation',
      name: 'Autonomous Escalation & Resolution Agent',
      description: 'Monitors issue stagnation, escalates priority on persistent issues, and resolves verified items.',
      priority: 9,
    },
    insights: {
      id: 'agent_insights',
      name: 'Urban Planning & Predictive Insights Agent',
      description: 'Analyzes 30-day civic data trends to generate predictive maintenance recommendations and hot-spot forecasts.',
      priority: 5,
    }
  },
  workflows: {
    issueReporting: {
      steps: ['agent_ingestion', 'agent_duplicate']
    },
    escalationCycle: {
      steps: ['agent_escalation']
    }
  }
};

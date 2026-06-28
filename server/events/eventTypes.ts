export enum EventType {
  IssueCreated = 'IssueCreated',
  DuplicateDetected = 'DuplicateDetected',
  IssueVerified = 'IssueVerified',
  DepartmentAssigned = 'DepartmentAssigned',
  Escalated = 'Escalated',
  Resolved = 'Resolved',
  RewardGranted = 'RewardGranted',
  InsightsTriggered = 'InsightsTriggered'
}

export interface EventPayloads {
  [EventType.IssueCreated]: { issueId: string; userId: string };
  [EventType.DuplicateDetected]: { issueId: string; duplicateOfIssueId: string; distanceMeters: number };
  [EventType.IssueVerified]: { issueId: string; userId: string; vote: 'upvote' | 'downvote'; verificationPercentage: number };
  [EventType.DepartmentAssigned]: { issueId: string; department: string };
  [EventType.Escalated]: { issueId: string; newLevel: number; severity: string; reason: string };
  [EventType.Resolved]: { issueId: string; resolutionCode: string };
  [EventType.RewardGranted]: { userId: string; points: number; badge?: string };
  [EventType.InsightsTriggered]: { timestamp: string; count: number };
}

export interface AppEvent<T extends EventType = EventType> {
  type: T;
  payload: EventPayloads[T];
  timestamp: string;
  metadata?: Record<string, any>;
}

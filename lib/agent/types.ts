export interface AgentState {
  scriptId: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  scriptTitle: string;
  scriptContent: string;
  sentAt: string;
  dueDate: string | null;
  hoursOverdue: number;
  clientMemories: string[];
  generatedEmail: string | null;
  emailSubject: string | null;
  chaserId: string | null;
  error: string | null;
  // Sentiment analysis (item 2)
  urgencyScore: number | null;
  toneRecommendation: string | null;
  // Self-critique loop (item 3)
  critiqueScores: CritiqueScores | null;
  revisionCount: number;
  // Execution log (items 2-4)
  nodeExecutionLog: NodeLogEntry[];
  // HITL interrupt/resume (set during graph execution, not required at init)
  hitlAction?: string | null;
  hitlEditedContent?: string | null;
  recommendedChannel?: string | null;
  preferredChannel?: string | null;
}

export interface CritiqueScores {
  professionalism: number;
  personalization: number;
  clarity: number;
  persuasiveness: number;
  average: number;
  feedback: string;
}

export interface NodeLogEntry {
  node: string;
  timestamp: string;
  durationMs: number;
  summary: string;
}

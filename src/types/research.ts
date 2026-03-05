// Research-related TypeScript types

export type ResearchStatus =
  | 'idle'
  | 'clarifying'
  | 'researching'
  | 'complete'
  | 'error';

export type ActivityType =
  | 'thinking'
  | 'searching'
  | 'reading'
  | 'found'
  | 'analyzing'
  | 'result'
  | 'complete'
  | 'error';

export interface ActivityMessage {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    count?: number;
    articleTitle?: string;
    [key: string]: unknown;
  };
}

export type QuestionType = 'text' | 'choice' | 'multi-choice' | 'date';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: QuestionOption[];
  required?: boolean;
  placeholder?: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | string[];
}

export interface ResearchResult {
  summary: string;
  sources: Source[];
  findings: Finding[];
  relatedTopics?: string[];
}

export interface Source {
  id: string;
  title: string;
  author?: string;
  publication?: string;
  date?: string;
  url?: string;
  type: 'papa-kilo' | 'newspaper' | 'web' | 'other';
  excerpt?: string;
}

export interface Finding {
  id: string;
  title: string;
  content: string;
  sources: string[]; // Source IDs
  confidence?: 'high' | 'medium' | 'low';
}

export interface ResearchSession {
  id: string;
  userId: string;
  query: string;
  status: ResearchStatus;
  clarifyingQuestions?: ClarifyingQuestion[];
  answers?: QuestionAnswer[];
  activityStream: ActivityMessage[];
  results?: ResearchResult;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface StreamEvent {
  type: 'activity' | 'result' | 'complete' | 'error' | 'questions';
  data: ActivityMessage | Partial<ResearchResult> | ClarifyingQuestion[] | { error: string };
}

export interface BrainfishSessionData {
  apiToken?: string;
  agentKey?: string;
  [key: string]: unknown;
}

export interface BrainfishConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface BrainfishError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface Document {
  id: string;
  url: string;
  urlId: string;
  title: string;
  text?: string;
  summary?: string;
  revision?: number;
  collectionId: string;
  parentDocumentId?: string;
  template?: boolean;
  templateId?: string;
  fullWidth?: boolean;
  siteEnabled?: boolean;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  createdBy?: UserSummary;
  updatedBy?: UserSummary;
  isPublic?: boolean;
  hasPendingSuggestion?: boolean;
}

export interface DocumentListItem {
  id: string;
  url: string;
  urlId: string;
  title: string;
  summary?: string;
  tasks?: {
    completed: number;
    total: number;
  };
  index: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  publishedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  teamId: string;
  collectionId: string;
  revision: number;
  isPublic: boolean;
  hasPendingSuggestion: boolean;
}

export interface UserSummary {
  id?: string;
  name?: string;
  avatarUrl?: string;
}

export interface Collection {
  id: string;
  url: string;
  urlId?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  index?: string;
  permission?: 'read' | 'read_write';
  sharing?: boolean;
  siteEnabled?: boolean;
  documents?: unknown[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DocumentSuggestion {
  id: string;
  documentId: string;
  title?: string;
  text: string;
  reason: string;
  source?: string;
  sourceId?: string;
  createdAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  staledAt?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  score: number;
  percent: number;
  chunk: string;
  url: string;
  collectionId: string;
  isPublic: boolean;
  lastUpdated?: string;
}

export interface StreamingEvent {
  type: 'start' | 'progress' | 'content' | 'end';
  id?: string;
  conversationId?: string;
  content?: string;
  complete?: boolean;
}

export interface PaginationInfo {
  offset?: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: PaginationInfo;
  query?: string;
  timestamp: string;
}

export interface Catalog {
  id: string;
  teamId?: string;
  name: string;
  source: string;
  status: 'inprogress' | 'completed' | 'failed';
  enabled?: boolean;
  dailySync?: boolean;
  configurations?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncError?: string;
  contentCount?: number;
}

export interface SyncContentFile {
  url: string;
  content: string;
  title: string;
}

export interface SyncContentResult {
  id: string;
  name: string;
  source: string;
  status: string;
  contentCount: number;
  created: number;
  updated: number;
  removed: number;
}

export interface ArticleSuggestionTask {
  task_id: string;
  status: string;
}

export interface AnalyticsThread {
  id: string;
  question: string;
  source: {
    name: string;
    color?: string;
  };
  resolutionStatus: string | null;
  timestamp: string;
  value: string;
  hasAttributes: boolean;
  conversationScore: number | null;
}

export interface AnalyticsThreadsResponse {
  data: AnalyticsThread[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
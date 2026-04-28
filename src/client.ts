import type {
  BrainfishConfig,
  BrainfishSessionData,
  BrainfishError,
  ApiResponse,
  Document,
  DocumentListItem,
  Collection,
  SearchResult,
  StreamingEvent,
  Catalog,
  SyncContentFile,
  SyncContentResult,
  ArticleSuggestionTask,
  SessionSummary,
  SessionDetail,
  TimelineEvent,
  SessionInsights,
  SearchSessionsRequest,
  AnalyticsThreadsResponse
} from './types.js';

export class BrainfishClient {
  private config: BrainfishConfig;
  private session: BrainfishSessionData;

  constructor(session: BrainfishSessionData, config?: Partial<BrainfishConfig>) {
    this.session = session;
    this.config = {
      baseUrl: process.env.BRAINFISH_API_URL || 'https://api.brainfi.sh',
      timeout: parseInt(process.env.BRAINFISH_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.BRAINFISH_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.BRAINFISH_RETRY_DELAY || '1000'),
      ...config
    };
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      requiresAgentKey?: boolean;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, requiresAgentKey = false } = options;

    if (!this.session.apiToken) {
      throw new Error('Brainfish API token is required');
    }

    if (requiresAgentKey && !this.session.agentKey) {
      throw new Error('Agent key is required for this endpoint');
    }

    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.session.apiToken}`,
      'Content-Type': 'application/json',
      ...headers
    };

    if (requiresAgentKey && this.session.agentKey) {
      requestHeaders['agent-key'] = this.session.agentKey;
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
          const errorData = await response.json() as BrainfishError;
          
          // Retry on rate limit (429) or server errors (5xx)
          if ((response.status === 429 || response.status >= 500) && attempt < this.config.retryAttempts) {
            const delay = this.config.retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw new BrainfishApiError(
            errorData.error || 'api_error',
            errorData.message || 'An error occurred',
            response.status,
            errorData.requestId,
            errorData.validationErrors
          );
        }

        return await response.json() as T;
      } catch (error) {
        if (error instanceof BrainfishApiError) {
          throw error;
        }

        // Retry on network errors
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  // Authentication
  async validateToken(): Promise<ApiResponse<{ valid: boolean; user: unknown }>> {
    return this.request('/v1/auth/validate', { method: 'POST' });
  }

  async revokeToken(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request('/v1/auth/revoke', { method: 'POST' });
  }

  // Documents
  async searchDocuments(params: {
    query: string;
    collectionId?: string;
    collectionIds?: string[];
    dateFilter?: 'day' | 'week' | 'month' | 'year';
    limit?: number;
    cmsOnly?: boolean;
  }): Promise<ApiResponse<SearchResult[]>> {
    return this.request('/v1/documents/search', {
      method: 'POST',
      body: params
    });
  }

  async listDocuments(params: {
    collectionId?: string;
    parentDocumentId?: string;
    template?: boolean;
    sort?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
    direction?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<DocumentListItem[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/v1/documents?${queryString}` : '/v1/documents';
    
    return this.request(endpoint);
  }

  async getDocument(id: string): Promise<ApiResponse<Document>> {
    return this.request(`/v1/documents/${encodeURIComponent(id)}`);
  }

  async createDocument(params: {
    title?: string;
    text?: string;
    collectionId: string;
    parentDocumentId?: string;
    publish?: boolean;
    template?: boolean;
    templateId?: string;
  }): Promise<ApiResponse<Document>> {
    return this.request('/v1/documents', {
      method: 'POST',
      body: params
    });
  }

  async updateDocument(id: string, params: {
    title?: string;
    text?: string;
    publish?: boolean;
    fullWidth?: boolean;
    collectionId?: string;
    siteEnabled?: boolean;
  }): Promise<ApiResponse<Document>> {
    return this.request(`/v1/documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: params
    });
  }

  async deleteDocument(id: string, permanent: boolean = false): Promise<ApiResponse<{ success: boolean }>> {
    const params = permanent ? '?permanent=true' : '';
    return this.request(`/v1/documents/${encodeURIComponent(id)}${params}`, {
      method: 'DELETE'
    });
  }

  // Collections
  async listCollections(params: {
    sortBy?: 'updatedAt' | 'index' | 'name';
    direction?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Collection[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/v1/collections?${queryString}` : '/v1/collections';
    
    return this.request(endpoint);
  }

  async getCollection(id: string): Promise<ApiResponse<Collection>> {
    return this.request(`/v1/collections/${encodeURIComponent(id)}`);
  }

  async createCollection(params: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    permission?: 'read' | 'read_write';
    sharing?: boolean;
    siteEnabled?: boolean;
  }): Promise<ApiResponse<Collection>> {
    return this.request('/v1/collections', {
      method: 'POST',
      body: params
    });
  }

  async updateCollection(id: string, params: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    permission?: 'read' | 'read_write';
    sharing?: boolean;
    siteEnabled?: boolean;
  }): Promise<ApiResponse<Collection>> {
    return this.request(`/v1/collections/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: params
    });
  }

  async deleteCollection(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v1/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // Catalogs
  async listCatalogs(params: {
    source?: string;
    status?: 'inprogress' | 'completed' | 'failed';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Catalog[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/v1/catalogs?${queryString}` : '/v1/catalogs';
    return this.request(endpoint);
  }

  async createCatalog(params: {
    name: string;
    source: string;
    slug?: string;
    configurations?: Record<string, unknown>;
  }): Promise<ApiResponse<Catalog>> {
    return this.request('/v1/catalogs', {
      method: 'POST',
      body: params
    });
  }

  async getCatalog(id: string): Promise<ApiResponse<Catalog>> {
    return this.request(`/v1/catalogs/${encodeURIComponent(id)}`);
  }

  async syncCatalogContent(id: string, files: SyncContentFile[]): Promise<ApiResponse<SyncContentResult>> {
    return this.request(`/v1/catalogs/${encodeURIComponent(id)}/content`, {
      method: 'POST',
      body: { files }
    });
  }

  // Conversations
  async generateFollowUpQuestions(conversationId: string, limit?: number): Promise<ApiResponse<{ followUps: string[] }>> {
    return this.request(`/v1/conversations/${encodeURIComponent(conversationId)}/follow-ups`, {
      method: 'POST',
      body: limit !== undefined ? { limit } : {},
      requiresAgentKey: true
    });
  }

  // Analytics
  async getAnalyticsThreads(params: {
    dateRange: { from: number; to: number };
    limit?: number;
    offset?: number;
    sources?: string[];
    status?: string[];
    feedback?: string[];
    searchQuery?: string;
    actions?: string[];
  }): Promise<AnalyticsThreadsResponse> {
    return this.request('/v1/analytics/threads', {
      method: 'POST',
      body: params
    });
  }

  // Article Suggestions (async, AI-driven)
  async generateArticleSuggestion(params: {
    content: string;
    collection_id?: string;
    new_article?: boolean;
  }): Promise<ApiResponse<ArticleSuggestionTask>> {
    return this.request('/v1/documents/suggestion', {
      method: 'POST',
      body: params
    });
  }

  // Sessions / Analytics
  async searchSessions(params: SearchSessionsRequest): Promise<ApiResponse<SessionSummary[]>> {
    return this.request('/v1/sessions/search', {
      method: 'POST',
      body: params
    });
  }

  async getSession(id: string): Promise<{ data: SessionDetail; timestamp: string }> {
    return this.request(`/v1/sessions/${encodeURIComponent(id)}`);
  }

  async getSessionTimeline(id: string, params?: {
    limit?: number;
    includeSessionContext?: boolean;
    fromDate?: string;
    toDate?: string;
    eventNames?: string[];
    country?: string[];
    city?: string[];
    region?: string[];
    os?: string[];
    browser?: string[];
    device?: string[];
    referrerType?: string[];
  }): Promise<{ data: TimelineEvent[]; timestamp: string }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          if (value.length === 0) return;
          // Server expects comma-separated for these filter params.
          // Explicitly join so we don't rely on Array#toString coercion.
          searchParams.append(key, value.map(String).join(','));
        } else {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/v1/sessions/${encodeURIComponent(id)}/timeline?${queryString}`
      : `/v1/sessions/${encodeURIComponent(id)}/timeline`;
    return this.request(endpoint);
  }

  async generateSessionInsights(id: string, params?: {
    force?: boolean;
  }): Promise<{ data: SessionInsights; cached: boolean; timestamp: string }> {
    return this.request(`/v1/sessions/${encodeURIComponent(id)}/insights`, {
      method: 'POST',
      body: params ?? {}
    });
  }

  // AI Agents - Streaming
  async generateAnswer(params: {
    query: string;
    conversationId?: string;
  }): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/agents/answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.session.apiToken}`,
        'agent-key': this.session.agentKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json() as BrainfishError;
      throw new BrainfishApiError(
        errorData.error || 'api_error',
        errorData.message || 'An error occurred',
        response.status,
        errorData.requestId
      );
    }

    return this.handleStreamingResponse(response);
  }

  private async handleStreamingResponse(response: any): Promise<string> {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = '';
    let conversationId = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamingEvent = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case 'start':
                  if (event.conversationId) {
                    conversationId = event.conversationId;
                  }
                  break;
                case 'content':
                  if (event.content) {
                    fullAnswer += event.content;
                  }
                  break;
                case 'end':
                  // Stream completed
                  break;
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullAnswer;
  }
}

export class BrainfishApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public requestId?: string,
    public validationErrors?: Array<{
      field: string;
      message: string;
      code: string;
    }>
  ) {
    super(message);
    this.name = 'BrainfishApiError';
  }
}
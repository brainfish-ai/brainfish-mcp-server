export const TOOLS = {
  brainfish_search_documents: {
    name: 'brainfish_search_documents',
    description: 'Search documents in your Brainfish knowledge base using semantic search',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 2000 },
        collectionId: { type: 'string', format: 'uuid' },
        collectionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        dateFilter: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
        limit: { type: 'number', minimum: 1, maximum: 25, default: 10 },
        cmsOnly: { type: 'boolean', default: false }
      },
      required: ['query']
    }
  },
  brainfish_get_document: {
    name: 'brainfish_get_document',
    description: 'Retrieve a specific document by its ID or URL slug',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 }
      },
      required: ['id']
    }
  },
  brainfish_generate_user_answer: {
    name: 'brainfish_generate_user_answer',
    description: 'Generate streaming AI-powered answers, optionally scoped to specific collections',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 2000 },
        conversationId: { type: 'string', pattern: '^[0-9a-z]{25}$' },
        stream: { type: 'boolean', default: true },
        collectionIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Optional collection IDs to restrict which collections are searched'
        },
        attachments: {
          type: 'array',
          maxItems: 10,
          description: 'Optional image attachments',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['image'] },
              url: { type: 'string', format: 'uri' }
            },
            required: ['type', 'url']
          }
        }
      },
      required: ['query']
    }
  },
  brainfish_list_collections: {
    name: 'brainfish_list_collections',
    description: 'List available collections to understand content organization',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        sortBy: { type: 'string', enum: ['updatedAt', 'index', 'name'], default: 'updatedAt' },
        direction: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
        offset: { type: 'number', minimum: 0, default: 0 }
      },
      required: []
    }
  },
  brainfish_list_documents: {
    name: 'brainfish_list_documents',
    description: 'List documents in collections to understand existing content',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', format: 'uuid' },
        sort: { type: 'string', enum: ['createdAt', 'updatedAt', 'publishedAt', 'title'], default: 'updatedAt' },
        direction: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
        offset: { type: 'number', minimum: 0, default: 0 }
      },
      required: []
    }
  },
  brainfish_validate_token: {
    name: 'brainfish_validate_token',
    description: 'Validate your Brainfish API token and return user information',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // Collection management
  brainfish_get_collection: {
    name: 'brainfish_get_collection',
    description: 'Get details of a specific collection by its ID',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Collection ID' }
      },
      required: ['id']
    }
  },
  brainfish_create_collection: {
    name: 'brainfish_create_collection',
    description: 'Create a new collection to organise documents',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, description: 'Collection name' },
        description: { type: 'string', description: 'Collection description' },
        icon: { type: 'string', description: 'Icon emoji or name' },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', description: 'Hex colour code' },
        permission: { type: 'string', enum: ['read', 'read_write'], description: 'Default permission' },
        sharing: { type: 'boolean', description: 'Enable sharing' },
        siteEnabled: { type: 'boolean', description: 'Make collection public on site' }
      },
      required: ['name']
    }
  },
  brainfish_update_collection: {
    name: 'brainfish_update_collection',
    description: 'Update properties of an existing collection',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Collection ID' },
        name: { type: 'string', minLength: 1, description: 'New collection name' },
        description: { type: 'string', description: 'New description' },
        icon: { type: 'string', description: 'Icon emoji or name' },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', description: 'Hex colour code' },
        permission: { type: 'string', enum: ['read', 'read_write'], nullable: true },
        sharing: { type: 'boolean' },
        siteEnabled: { type: 'boolean', description: 'Public visibility on site' }
      },
      required: ['id']
    }
  },
  brainfish_delete_collection: {
    name: 'brainfish_delete_collection',
    description: 'Delete a collection and all its documents. Cannot delete the last collection in a team.',
    annotations: { readOnlyHint: false, destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Collection ID' }
      },
      required: ['id']
    }
  },

  // Document management
  brainfish_create_document: {
    name: 'brainfish_create_document',
    description: 'Create a new document/article in a collection',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
        text: { type: 'string', description: 'Document content in Markdown format' },
        collectionId: { type: 'string', format: 'uuid', description: 'Collection to create the document in' },
        parentDocumentId: { type: 'string', format: 'uuid', description: 'Parent document ID for nested documents' },
        publish: { type: 'boolean', description: 'Publish immediately (default: false)' },
        template: { type: 'boolean', description: 'Mark as a template document' },
        templateId: { type: 'string', format: 'uuid', description: 'Template ID to base the document on' }
      },
      required: []
    }
  },
  brainfish_update_document: {
    name: 'brainfish_update_document',
    description: 'Update an existing document by its ID or URL slug',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Document UUID or URL slug' },
        title: { type: 'string', description: 'New document title' },
        text: { type: 'string', description: 'New document content in Markdown format' },
        publish: { type: 'boolean', description: 'Publish or unpublish the document' },
        fullWidth: { type: 'boolean', description: 'Display document in full width' },
        collectionId: { type: 'string', format: 'uuid', description: 'Move document to a different collection' },
        siteEnabled: { type: 'boolean', description: 'Make document public on site' }
      },
      required: ['id']
    }
  },
  brainfish_move_document: {
    name: 'brainfish_move_document',
    description: 'Move a document and its children to another collection, optionally under a parent document or at a specific sibling index',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Document UUID to move' },
        collectionId: { type: 'string', format: 'uuid', description: 'Target collection ID' },
        parentDocumentId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
          description: 'Optional parent document ID within the target collection'
        },
        index: {
          type: 'integer',
          minimum: 0,
          description: 'Position index among siblings (0-based). Omit to place at the end.'
        }
      },
      required: ['id', 'collectionId']
    }
  },
  brainfish_delete_document: {
    name: 'brainfish_delete_document',
    description: 'Delete a document (soft-delete by default). Use permanent=true to permanently delete.',
    annotations: { readOnlyHint: false, destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Document UUID or URL slug' },
        permanent: { type: 'boolean', default: false, description: 'Permanently delete the document' }
      },
      required: ['id']
    }
  },
  brainfish_generate_article_suggestion: {
    name: 'brainfish_generate_article_suggestion',
    description: 'Trigger the Brainfish Knowledge Discovery Agent to analyse content and generate article suggestions asynchronously. Returns a task ID to track progress.',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1, description: 'Content to analyse in Markdown format' },
        collection_id: { type: 'string', format: 'uuid', description: 'Target collection for new article drafts' },
        new_article: { type: 'boolean', default: false, description: 'true = create new article drafts; false = suggest updates to existing documents' }
      },
      required: ['content']
    }
  },

  // AI Agents — follow-ups
  brainfish_generate_follow_ups: {
    name: 'brainfish_generate_follow_ups',
    description: 'Generate follow-up questions for a completed conversation based on the AI answer and source documents',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'Conversation ID from a previous answer generation session' },
        limit: { type: 'number', minimum: 1, maximum: 10, default: 3, description: 'Maximum number of follow-up questions to generate' }
      },
      required: ['conversationId']
    }
  },

  // Catalog management
  brainfish_list_catalogs: {
    name: 'brainfish_list_catalogs',
    description: 'List all catalogs for the authenticated team, with optional filtering by source type and status',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['cms', 'website', 'zendesk', 'github', 'discovery', 'helpscout', 'readme', 'readmev2', 'oas', 'notion', 'intercom', 'freshdesk', 'helpjuice', 'googledrive', 'confluence', 'guru', 'external'],
          description: 'Filter by catalog source type'
        },
        status: { type: 'string', enum: ['inprogress', 'completed', 'failed'], description: 'Filter by sync status' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
        offset: { type: 'number', minimum: 0, default: 0 }
      },
      required: []
    }
  },
  brainfish_create_catalog: {
    name: 'brainfish_create_catalog',
    description: 'Create a new catalog. After creation, use brainfish_sync_catalog_content to push content into it.',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255, description: 'Catalog name' },
        source: {
          type: 'string',
          enum: ['cms', 'website', 'zendesk', 'github', 'discovery', 'helpscout', 'readme', 'readmev2', 'oas', 'notion', 'intercom', 'freshdesk', 'helpjuice', 'googledrive', 'confluence', 'guru', 'external'],
          description: 'Catalog source type'
        },
        slug: { type: 'string', minLength: 1, maxLength: 100, description: 'Unique slug for this catalog' },
        configurations: { type: 'object', description: 'Optional source-specific configuration' }
      },
      required: ['name', 'source']
    }
  },
  brainfish_get_catalog: {
    name: 'brainfish_get_catalog',
    description: 'Retrieve a catalog by its ID, including a count of content entries',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Catalog ID' }
      },
      required: ['id']
    }
  },
  // Sessions / Analytics
  brainfish_search_sessions: {
    name: 'brainfish_search_sessions',
    description: 'Search chat sessions by query text and filters. Returns sessions (one per conversation) with full conversation turns included by default, so you can read the questions and answers without needing follow-up calls.',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for in user queries (ILIKE match)' },
        conversationId: { type: 'string', description: 'Filter by exact conversation ID' },
        userId: { type: 'string', format: 'uuid', description: 'Filter by platform user ID' },
        externalUserId: { type: 'string', description: 'Filter by external user ID' },
        widgetIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Filter by widget/agent IDs' },
        source: { type: 'string', description: 'Filter by source (e.g. widget, api, help_center)' },
        feedback: { type: 'string', enum: ['positive', 'negative'], nullable: true, description: 'Filter by feedback (null = no feedback)' },
        isAnswered: { type: 'boolean', description: 'Filter by whether the query was answered' },
        fromDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
        toDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'number', minimum: 0, default: 0 },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        includeTurns: { type: 'boolean', default: true, description: 'Include full conversation turns (query, answer, feedback) in each result. Defaults to true.' }
      },
      required: []
    }
  },
  brainfish_get_session: {
    name: 'brainfish_get_session',
    description: 'Get full conversation detail for a chat session: all turns (user query + AI answer + feedback) plus analytics metadata (start URL, session ID). Accepts a conversationId or searchQueryId.',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Conversation ID or search query ID' }
      },
      required: ['id']
    }
  },
  brainfish_get_session_timeline: {
    name: 'brainfish_get_session_timeline',
    description: 'Get the chronological analytics event timeline for a conversation — includes page views, widget interactions, search events, and chat turns with their properties. Supports filtering by event name, geo, device, browser, and referrer.',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Conversation ID' },
        limit: { type: 'number', minimum: 1, maximum: 1000, default: 200 },
        includeSessionContext: { type: 'boolean', default: true, description: 'Include session-level events (screen views, widget open/close) from the same session' },
        fromDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
        toDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
        eventNames: { type: 'array', items: { type: 'string' }, description: 'Filter by event name(s), e.g. ["screen_view", "Primary Field Search Submitted"]' },
        country: { type: 'array', items: { type: 'string' }, description: 'Filter by country code(s), e.g. ["US", "CA"]' },
        city: { type: 'array', items: { type: 'string' }, description: 'Filter by city name(s)' },
        region: { type: 'array', items: { type: 'string' }, description: 'Filter by region/state name(s)' },
        os: { type: 'array', items: { type: 'string' }, description: 'Filter by OS name(s), e.g. ["Mac OS", "Windows"]' },
        browser: { type: 'array', items: { type: 'string' }, description: 'Filter by browser name(s), e.g. ["Chrome", "Safari"]' },
        device: { type: 'array', items: { type: 'string' }, description: 'Filter by device type(s), e.g. ["desktop", "mobile"]' },
        referrerType: { type: 'array', items: { type: 'string' }, description: 'Filter by referrer type(s), e.g. ["search", "social", "direct"]' }
      },
      required: ['id']
    }
  },
  brainfish_generate_session_insights: {
    name: 'brainfish_generate_session_insights',
    description: 'Generate a structured LLM diagnosis of a chat session: root cause analysis, severity, evidence, and recommendations. Results are cached server-side (use force=true to regenerate).',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'Conversation ID or search query ID' },
        force: { type: 'boolean', default: false, description: 'Skip cache and regenerate insights' }
      },
      required: ['id']
    }
  },

  brainfish_sync_catalog_content: {
    name: 'brainfish_sync_catalog_content',
    description: 'Full sync of content files to a catalog. New files are created, changed files are updated, and files missing from the request are removed.',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Catalog ID' },
        files: {
          type: 'array',
          minItems: 1,
          description: 'Content files to sync',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string', minLength: 1, description: 'URL or path used as unique identifier within the catalog' },
              content: { type: 'string', description: 'File content (Markdown, plain text, etc.)' },
              title: { type: 'string', minLength: 1, description: 'Content title' }
            },
            required: ['url', 'content', 'title']
          }
        }
      },
      required: ['id', 'files']
    }
  },

  // Analytics
  brainfish_get_analytics_threads: {
    name: 'brainfish_get_analytics_threads',
    description: 'List and filter conversation threads with analytics data (question, source, resolution status, conversation score). Requires a date range.',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: {
          type: 'object',
          description: 'Date range filter (Unix timestamps in milliseconds)',
          properties: {
            from: { type: 'number', description: 'Start date as Unix timestamp (ms)' },
            to: { type: 'number', description: 'End date as Unix timestamp (ms)' }
          },
          required: ['from', 'to']
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 10, description: 'Number of threads to return' },
        offset: { type: 'number', minimum: 0, default: 0, description: 'Pagination offset' },
        sources: { type: 'array', items: { type: 'string' }, description: 'Filter by channel keys (source identifiers)' },
        status: {
          type: 'array',
          items: { type: 'string', enum: ['answered', 'partial', 'unable_to_help', 'technical_issue', 'skipped'] },
          description: 'Filter by resolution status'
        },
        feedback: {
          type: 'array',
          items: { type: 'string', enum: ['positive', 'negative'] },
          description: 'Filter by user feedback type'
        },
        searchQuery: { type: 'string', description: 'Search within user messages across threads' },
        actions: { type: 'array', items: { type: 'string' }, description: 'Filter by action types' }
      },
      required: ['dateRange']
    }
  }
};

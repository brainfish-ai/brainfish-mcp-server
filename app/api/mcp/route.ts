import { NextRequest, NextResponse } from 'next/server';
import { BrainfishClient, BrainfishApiError } from '../../../src/client';
import type { BrainfishSessionData } from '../../../src/types';

function extractBrainfishCredentials(request: NextRequest): { 
  apiToken?: string; 
  agentKey?: string; 
} {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-brainfish-api-key') || request.headers.get('x-api-key');
  const agentKeyHeader = request.headers.get('agent-key') || undefined;

  let apiToken: string | undefined;
  let oauthAgentKey: string | undefined;

  if (apiKeyHeader) {
    apiToken = apiKeyHeader;
  } else if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    // Try to decode OAuth access token (base64url JSON with {token, agentKey})
    try {
      const decoded = JSON.parse(Buffer.from(bearer, 'base64url').toString('utf8'));
      if (decoded?.token) {
        apiToken = decoded.token;
        oauthAgentKey = decoded.agentKey;
      } else {
        apiToken = bearer; // raw API key (Cursor / direct header usage)
      }
    } catch {
      apiToken = bearer; // raw API key
    }
  }

  return { apiToken, agentKey: agentKeyHeader ?? oauthAgentKey };
}

const WWW_AUTHENTICATE =
  'Bearer realm="Brainfish MCP", resource_metadata="https://mcp.brainfi.sh/.well-known/oauth-authorization-server"';

function createBrainfishClient(session: BrainfishSessionData): BrainfishClient {
  if (!session.apiToken) {
    throw new Error('Brainfish API token is required');
  }
  
  return new BrainfishClient(session);
}

function handleBrainfishError(error: unknown) {
  if (error instanceof BrainfishApiError) {
    return NextResponse.json({
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(error.requestId && { requestId: error.requestId }),
      ...(error.validationErrors && { validationErrors: error.validationErrors })
    }, { status: error.statusCode });
  }
  
  return NextResponse.json({
    error: 'unknown_error',
    message: error instanceof Error ? error.message : 'An unknown error occurred'
  }, { status: 500 });
}

// MCP Protocol Implementation
interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Tool definitions
const TOOLS = {
  brainfish_search_documents: {
    name: 'brainfish_search_documents',
    description: 'Search documents in your Brainfish knowledge base using semantic search',
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
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 }
      },
      required: ['id']
    }
  },
  brainfish_suggest_document_changes: {
    name: 'brainfish_suggest_document_changes',
    description: 'Create a suggestion to improve or update an existing document',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', minLength: 1 },
        title: { type: 'string' },
        text: { type: 'string', minLength: 1 },
        reason: { type: 'string', default: '' },
        source: { type: 'string', default: 'mcp_client' },
        sourceId: { type: 'string' }
      },
      required: ['documentId', 'text']
    }
  },
  brainfish_suggest_new_document: {
    name: 'brainfish_suggest_new_document',
    description: 'Suggest creating a new document (requires existing document as base for suggestion system)',
    inputSchema: {
      type: 'object',
      properties: {
        baseDocumentId: { type: 'string', minLength: 1 },
        title: { type: 'string', minLength: 1 },
        text: { type: 'string', minLength: 1 },
        reason: { type: 'string', default: 'Suggested new document creation' },
        source: { type: 'string', default: 'mcp_client' },
        collectionId: { type: 'string' }
      },
      required: ['baseDocumentId', 'title', 'text']
    }
  },
  brainfish_update_suggestion: {
    name: 'brainfish_update_suggestion',
    description: 'Update an existing document suggestion',
    inputSchema: {
      type: 'object',
      properties: {
        suggestionId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        text: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['suggestionId']
    }
  },
  brainfish_generate_answer: {
    name: 'brainfish_generate_answer',
    description: 'Generate streaming AI-powered answers from your knowledge base',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 2000 },
        conversationId: { type: 'string', pattern: '^[0-9a-z]{25}$' }
      },
      required: ['query']
    }
  },
  brainfish_list_collections: {
    name: 'brainfish_list_collections',
    description: 'List available collections to understand content organization',
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
  brainfish_delete_document: {
    name: 'brainfish_delete_document',
    description: 'Delete a document (soft-delete by default). Use permanent=true to permanently delete.',
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
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Catalog ID' }
      },
      required: ['id']
    }
  },
  brainfish_sync_catalog_content: {
    name: 'brainfish_sync_catalog_content',
    description: 'Full sync of content files to a catalog. New files are created, changed files are updated, and files missing from the request are removed.',
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
  }
};

async function handleToolCall(toolName: string, args: any, request: NextRequest) {
  const { apiToken, agentKey } = extractBrainfishCredentials(request);
  
  if (!apiToken) {
    throw new Error('Brainfish API token is required');
  }
  
  const client = createBrainfishClient({ apiToken, agentKey });
  
  switch (toolName) {
    case 'brainfish_search_documents':
      return await client.searchDocuments(args);
      
      
    case 'brainfish_get_document':
      return await client.getDocument(args.id);
      
    case 'brainfish_suggest_document_changes':
      const { documentId, ...suggestionParams } = args;
      return await client.createDocumentSuggestion(documentId, suggestionParams);
      
    case 'brainfish_suggest_new_document':
      const { baseDocumentId, title, text, reason, source, collectionId } = args;
      // For new document suggestions, we create a suggestion on a base document
      // with clear indication it's for new content
      const newDocSuggestion = {
        title: `[NEW DOCUMENT] ${title}`,
        text: `# Suggested New Document: ${title}\n\n${text}\n\n---\n*Suggested Collection: ${collectionId || 'Default'}*`,
        reason: `${reason} - This is a suggestion for creating a new document.`,
        source: source || 'mcp_client'
      };
      return await client.createDocumentSuggestion(baseDocumentId, newDocSuggestion);
      
    case 'brainfish_update_suggestion':
      const { suggestionId, ...updateParams } = args;
      return await client.updateDocumentSuggestion(suggestionId, updateParams);
      
    case 'brainfish_generate_answer':
      if (!agentKey) {
        throw new Error('Agent key is required for AI answer generation. Find your agent key in the Brainfish dashboard under Agents.');
      }
      return await client.generateAnswer(args);
      
    case 'brainfish_list_collections':
      return await client.listCollections(args);
      
    case 'brainfish_list_documents':
      return await client.listDocuments(args);
      
    case 'brainfish_validate_token':
      return await client.validateToken();

    // Collection management
    case 'brainfish_get_collection':
      return await client.getCollection(args.id);

    case 'brainfish_create_collection': {
      const { ...collectionParams } = args;
      return await client.createCollection(collectionParams);
    }

    case 'brainfish_update_collection': {
      const { id: collectionId, ...collectionUpdateParams } = args;
      return await client.updateCollection(collectionId, collectionUpdateParams);
    }

    case 'brainfish_delete_collection':
      return await client.deleteCollection(args.id);

    // Document management
    case 'brainfish_create_document': {
      const { ...docParams } = args;
      return await client.createDocument(docParams);
    }

    case 'brainfish_update_document': {
      const { id: docId, ...docUpdateParams } = args;
      return await client.updateDocument(docId, docUpdateParams);
    }

    case 'brainfish_delete_document':
      return await client.deleteDocument(args.id, args.permanent ?? false);

    case 'brainfish_generate_article_suggestion':
      return await client.generateArticleSuggestion(args);

    // AI Agents — follow-ups
    case 'brainfish_generate_follow_ups':
      if (!agentKey) {
        throw new Error('Agent key is required for follow-up generation. Find your agent key in the Brainfish dashboard under Agents.');
      }
      return await client.generateFollowUpQuestions(args.conversationId, args.limit);

    // Catalog management
    case 'brainfish_list_catalogs':
      return await client.listCatalogs(args);

    case 'brainfish_create_catalog': {
      const { ...catalogParams } = args;
      return await client.createCatalog(catalogParams);
    }

    case 'brainfish_get_catalog':
      return await client.getCatalog(args.id);

    case 'brainfish_sync_catalog_content':
      return await client.syncCatalogContent(args.id, args.files);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function handleResourceRead(uri: string, request: NextRequest) {
  const { apiToken, agentKey } = extractBrainfishCredentials(request);
  if (!apiToken) {
    throw new Error('Brainfish API token is required');
  }
  const client = createBrainfishClient({ apiToken, agentKey });

  // brainfish://collections
  if (uri === 'brainfish://collections') {
    const result = await client.listCollections();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  // brainfish://collection/{id}/documents
  const collectionDocsMatch = uri.match(/^brainfish:\/\/collection\/([^/]+)\/documents$/);
  if (collectionDocsMatch) {
    const collectionId = decodeURIComponent(collectionDocsMatch[1]);
    const result = await client.listDocuments({ collectionId });
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  // brainfish://collection/{id}
  const collectionMatch = uri.match(/^brainfish:\/\/collection\/([^/]+)$/);
  if (collectionMatch) {
    const collectionId = decodeURIComponent(collectionMatch[1]);
    const result = await client.getCollection(collectionId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  // brainfish://document/{id}
  const documentMatch = uri.match(/^brainfish:\/\/document\/([^?]+)$/);
  if (documentMatch) {
    const documentId = decodeURIComponent(documentMatch[1]);
    const result = await client.getDocument(documentId);
    const doc = (result as any)?.data;
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: doc?.text ?? JSON.stringify(result, null, 2)
      }]
    };
  }

  // brainfish://search?query={q}&collectionId={id}
  if (uri.startsWith('brainfish://search')) {
    const searchUrl = new URL(uri.replace('brainfish://', 'https://brainfish.internal/'));
    const query = searchUrl.searchParams.get('query');
    if (!query) {
      throw new Error('brainfish://search resource requires a query parameter');
    }
    const collectionId = searchUrl.searchParams.get('collectionId') ?? undefined;
    const result = await client.searchDocuments({ query, collectionId });
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

export async function POST(request: NextRequest) {
  // OAuth 2.1: return 401 with discovery hint when no credentials provided
  const { apiToken } = extractBrainfishCredentials(request);
  if (!apiToken) {
    return new NextResponse(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Authentication required' } }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': WWW_AUTHENTICATE,
        },
      }
    );
  }

  try {
    const body: MCPRequest = await request.json();

    // JSON-RPC 2.0: notifications have no `id`. Servers MUST NOT respond to them.
    if (body.id === undefined || body.id === null) {
      return new NextResponse(null, { status: 202 });
    }
    
    // Handle different MCP methods
    switch (body.method) {
      case 'initialize':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: 'brainfish-mcp-server',
              version: '1.0.0'
            }
          }
        });
        
      case 'tools/list':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools: Object.values(TOOLS)
          }
        });
        
      case 'tools/call': {
        const { name, arguments: args } = body.params;
        const result = await handleToolCall(name, args, request);
        
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          }
        });
      }

      case 'resources/list':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            resources: [
              {
                uri: 'brainfish://collections',
                name: 'All Collections',
                description: 'List of all accessible Brainfish collections',
                mimeType: 'application/json'
              },
              {
                uri: 'brainfish://collection/{id}',
                name: 'Collection Details',
                description: 'Details and metadata for a specific collection',
                mimeType: 'application/json'
              },
              {
                uri: 'brainfish://collection/{id}/documents',
                name: 'Collection Documents',
                description: 'List of documents within a specific collection',
                mimeType: 'application/json'
              },
              {
                uri: 'brainfish://document/{id}',
                name: 'Document Content',
                description: 'Full content of a specific document in Markdown format',
                mimeType: 'text/markdown'
              },
              {
                uri: 'brainfish://search?query={q}',
                name: 'Search Results',
                description: 'Semantic search results for a query across the knowledge base',
                mimeType: 'application/json'
              }
            ]
          }
        });

      case 'resources/read': {
        const resourceResult = await handleResourceRead(body.params?.uri, request);
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: resourceResult
        });
      }

      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`
          }
        });
    }
  } catch (error) {
    console.error('MCP Server Error:', error);
    return handleBrainfishError(error);
  }
}

export async function GET(request: NextRequest) {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    const toolGroups: Record<string, { icon: string; tools: string[] }> = {
      'Search & Documents': {
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
        tools: ['brainfish_search_documents','brainfish_get_document','brainfish_list_documents','brainfish_create_document','brainfish_update_document','brainfish_delete_document']
      },
      'Suggestions': {
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
        tools: ['brainfish_suggest_document_changes','brainfish_suggest_new_document','brainfish_update_suggestion','brainfish_generate_article_suggestion']
      },
      'Collections': {
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
        tools: ['brainfish_list_collections','brainfish_get_collection','brainfish_create_collection','brainfish_update_collection','brainfish_delete_collection']
      },
      'AI & Answers': {
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
        tools: ['brainfish_generate_answer','brainfish_generate_follow_ups']
      },
      'Catalogs': {
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
        tools: ['brainfish_list_catalogs','brainfish_get_catalog','brainfish_create_catalog','brainfish_sync_catalog_content']
      },
      'Auth': {
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
        tools: ['brainfish_validate_token']
      }
    };

    const toolGroupsHtml = Object.entries(toolGroups).map(([groupName, group]) => {
      const tags = group.tools.map(t => {
        const label = t.replace('brainfish_', '').replace(/_/g, ' ');
        return `<span class="tool-tag">${label}</span>`;
      }).join('');
      return `
        <div class="tool-group">
          <div class="tool-group-header">
            <span class="tool-group-icon">${group.icon}</span>
            <span class="tool-group-name">${groupName}</span>
            <span class="tool-group-count">${group.tools.length}</span>
          </div>
          <div class="tool-tags">${tags}</div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Brainfish MCP Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #171717;
      --surface: #262626;
      --surface-hover: #2e2e2e;
      --border: #333333;
      --brand: #a3e635;
      --brand-dim: rgba(163,230,53,.12);
      --text: #ffffff;
      --text-muted: #a3a3a3;
      --text-dim: #737373;
      --radius: 12px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }

    /* Nav */
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 2rem;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      background: rgba(23,23,23,.85);
      backdrop-filter: blur(12px);
      z-index: 10;
    }
    .logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      opacity: 1;
      transition: opacity .15s;
    }
    .logo:hover { opacity: .8; }
    .logo svg { flex-shrink: 0; height: 26px; width: auto; }
    .nav-badge {
      font-size: .6875rem;
      font-weight: 600;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--brand);
      background: var(--brand-dim);
      border: 1px solid rgba(163,230,53,.25);
      padding: .25rem .625rem;
      border-radius: 9999px;
    }

    /* Hero */
    .hero {
      max-width: 720px;
      margin: 0 auto;
      padding: 5rem 2rem 3.5rem;
      text-align: center;
    }
    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      font-size: .75rem;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: 1.5rem;
    }
    .hero-eyebrow::before,
    .hero-eyebrow::after {
      content: '';
      display: block;
      width: 24px;
      height: 1px;
      background: var(--brand);
      opacity: .5;
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      letter-spacing: -.03em;
      line-height: 1.15;
      margin-bottom: 1.25rem;
    }
    h1 span { color: var(--brand); }
    .hero-sub {
      font-size: 1.0625rem;
      color: var(--text-muted);
      max-width: 520px;
      margin: 0 auto 2.5rem;
    }
    .endpoint-pill {
      display: inline-flex;
      align-items: center;
      gap: .75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 9999px;
      padding: .625rem 1.25rem .625rem .875rem;
      font-family: 'SFMono-Regular', 'Consolas', monospace;
      font-size: .875rem;
      color: var(--brand);
      margin-bottom: 2rem;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .endpoint-pill:hover { border-color: var(--brand); background: var(--brand-dim); }
    .endpoint-pill .dot {
      width: 8px; height: 8px;
      background: var(--brand);
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 6px var(--brand);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100% { opacity: 1; }
      50% { opacity: .4; }
    }
    .copy-hint { font-size: .7rem; color: var(--text-dim); }
    .hero-actions {
      display: flex;
      gap: .875rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      font-size: .875rem;
      font-weight: 600;
      padding: .6875rem 1.375rem;
      border-radius: 8px;
      text-decoration: none;
      transition: opacity .15s, transform .1s;
      border: none;
      cursor: pointer;
    }
    .btn:hover { opacity: .88; transform: translateY(-1px); }
    .btn-primary { background: var(--brand); color: #171717; }
    .btn-secondary {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { border-color: #555; }

    /* Main content */
    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 0 2rem 5rem;
    }

    /* Section */
    .section { margin-bottom: 3rem; }
    .section-label {
      font-size: .6875rem;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 1rem;
    }

    /* Setup tabs */
    .setup-tabs {
      display: flex;
      gap: .25rem;
      margin-bottom: .875rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 9999px;
      padding: .25rem;
      width: fit-content;
    }
    .setup-tab {
      font-size: .8125rem;
      font-weight: 500;
      padding: .375rem 1rem;
      border-radius: 9999px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .setup-tab.active { background: var(--brand); color: #171717; font-weight: 600; }
    .setup-panel { display: none; }
    .setup-panel.active { display: block; }

    /* Claude steps */
    .claude-setup { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .claude-steps { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .claude-step { display: flex; gap: 1rem; align-items: flex-start; }
    .step-num {
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--brand-dim);
      border: 1px solid rgba(163,230,53,.3);
      color: var(--brand);
      font-size: .75rem;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      margin-top: .1rem;
    }
    .step-body { flex: 1; }
    .step-title { font-size: .875rem; font-weight: 600; color: var(--text); margin-bottom: .375rem; }
    .step-desc { font-size: .8125rem; color: var(--text-muted); line-height: 1.55; }
    .step-desc a { color: var(--brand); text-decoration: none; }
    .step-desc a:hover { text-decoration: underline; }
    .step-desc strong { color: var(--text); }
    .claude-url-block {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      padding: .75rem 1rem;
      margin-top: .625rem;
      cursor: pointer;
      font-family: 'Consolas','Monaco',monospace;
      font-size: .8125rem;
      color: #d4d4d4;
      transition: border-color .15s;
    }
    .claude-url-block:hover { border-color: var(--brand); }
    .url-token { color: #ce9178; }
    .url-copy { font-size: .6875rem; font-weight: 600; color: var(--text-dim); white-space: nowrap; flex-shrink: 0; }
    .inline-code {
      font-family: 'Consolas','Monaco',monospace;
      font-size: .75rem;
      background: rgba(255,255,255,.07);
      padding: .1rem .4rem;
      border-radius: 4px;
      color: #9cdcfe;
    }
    .claude-note {
      display: flex;
      align-items: flex-start;
      gap: .5rem;
      padding: .875rem 1.5rem;
      background: rgba(255,255,255,.02);
      border-top: 1px solid var(--border);
      font-size: .75rem;
      color: var(--text-dim);
      line-height: 1.5;
    }
    .claude-note svg { flex-shrink: 0; margin-top: .1rem; color: var(--text-dim); }

    /* Monaco-style editor */
    .monaco-editor {
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,.45);
      font-family: 'Consolas','Monaco','Menlo',monospace;
      font-size: .8125rem;
      line-height: 1.6;
      border: 1px solid #3c3c3c;
    }
    .monaco-titlebar {
      background: #2d2d2d;
      display: flex;
      align-items: center;
      padding: 0 1rem;
      height: 35px;
      border-bottom: 1px solid #1e1e1e;
      gap: .5rem;
    }
    .monaco-dots { display: flex; gap: .375rem; align-items: center; }
    .monaco-dot {
      width: 12px; height: 12px; border-radius: 50%;
    }
    .monaco-dot.red    { background: #ff5f57; }
    .monaco-dot.yellow { background: #ffbd2e; }
    .monaco-dot.green  { background: #28c840; }
    .monaco-tabs {
      display: flex;
      background: #2d2d2d;
      border-bottom: 1px solid #1e1e1e;
    }
    .monaco-tab {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .5rem 1rem;
      font-size: .75rem;
      color: #cccccc;
      background: #1e1e1e;
      border-right: 1px solid #3c3c3c;
      border-top: 1px solid #a3e635;
    }
    .monaco-tab-icon { color: #e8c27a; font-size: .625rem; }
    .monaco-body {
      background: #1e1e1e;
      display: flex;
    }
    .monaco-gutter {
      background: #1e1e1e;
      padding: 1rem 0;
      min-width: 44px;
      text-align: right;
      user-select: none;
      border-right: 1px solid #2d2d2d;
    }
    .monaco-gutter span {
      display: block;
      padding: 0 .75rem;
      font-size: .75rem;
      line-height: 1.6;
      color: #4e4e4e;
    }
    .monaco-gutter span.active { color: #c6c6c6; }
    .monaco-code {
      padding: 1rem 1.25rem;
      overflow-x: auto;
      flex: 1;
    }
    pre {
      margin: 0;
      color: #d4d4d4;
      line-height: 1.6;
      white-space: pre;
    }
    .monaco-statusbar {
      background: #007acc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 .875rem;
      height: 22px;
    }
    .monaco-statusbar-left,
    .monaco-statusbar-right {
      display: flex;
      align-items: center;
      gap: .75rem;
      font-size: .6875rem;
      color: rgba(255,255,255,.9);
    }
    .monaco-copy-btn {
      font-size: .6875rem;
      font-weight: 600;
      color: rgba(255,255,255,.8);
      background: rgba(255,255,255,.1);
      border: none;
      border-radius: 3px;
      padding: .1rem .5rem;
      cursor: pointer;
      transition: background .15s;
    }
    .monaco-copy-btn:hover { background: rgba(255,255,255,.2); }
    /* VS Code JSON token colors */
    .tok-brace   { color: #d4d4d4; }
    .tok-key     { color: #9cdcfe; }
    .tok-str     { color: #ce9178; }
    .tok-comment { color: #6a9955; font-style: italic; }

    /* Tool groups */
    .tool-groups { display: flex; flex-direction: column; gap: .625rem; }
    .tool-group {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      transition: border-color .2s;
    }
    .tool-group:hover { border-color: rgba(163,230,53,.25); }
    .tool-group-header {
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-bottom: .75rem;
    }
    .tool-group-icon {
      display: flex;
      align-items: center;
      color: var(--brand);
    }
    .tool-group-name {
      font-size: .8125rem;
      font-weight: 600;
      color: var(--text);
      flex: 1;
    }
    .tool-group-count {
      font-size: .6875rem;
      font-weight: 600;
      color: var(--brand);
      background: var(--brand-dim);
      padding: .125rem .5rem;
      border-radius: 9999px;
    }
    .tool-tags { display: flex; flex-wrap: wrap; gap: .375rem; }
    .tool-tag {
      font-size: .75rem;
      font-weight: 500;
      color: var(--text-muted);
      background: rgba(255,255,255,.05);
      border: 1px solid var(--border);
      border-radius: 9999px;
      padding: .25rem .75rem;
      text-transform: capitalize;
      transition: color .15s, border-color .15s, background .15s;
      cursor: default;
    }
    .tool-tag:hover {
      color: var(--brand);
      border-color: rgba(163,230,53,.4);
      background: var(--brand-dim);
    }

    /* Security note */
    .security-note {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
    }
    .security-icon {
      width: 32px; height: 32px;
      background: var(--brand-dim);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: .875rem;
    }
    .security-note p { font-size: .8125rem; color: var(--text-muted); line-height: 1.5; }
    .security-note strong { color: var(--text); }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: .75rem;
      color: var(--text-dim);
    }
    footer a { color: var(--text-muted); text-decoration: none; }
    footer a:hover { color: var(--brand); }

    @media (max-width: 600px) {
      nav { padding: 1rem; }
      .hero { padding: 3rem 1rem 2rem; }
      main { padding: 0 1rem 4rem; }
      .tools-grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>

<nav>
  <a class="logo" href="https://brainfi.sh" target="_blank" rel="noopener">
    <svg width="400" height="62" viewBox="0 0 400 62" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M8.29086 46.9233L22.2215 30.5054L8.29086 14.1082C6.76137 12.3232 6.96804 9.64568 8.74554 8.10973C9.55163 7.42479 12.7966 6.40774 14.6981 8.56636L27.9054 24.1126C29.6352 22.3619 31.4401 20.7416 33.3112 19.2558C42.8873 11.6516 54.1988 7.57008 66.0599 7.57008C81.7681 7.57008 96.5049 14.7516 107.542 27.7449C108.885 29.3431 108.885 31.6885 107.542 33.2867C96.5049 46.3007 81.7681 53.4615 66.0599 53.4615C54.2003 53.4615 42.8901 49.3664 33.3148 41.7715C31.4424 40.2863 29.6363 38.6674 27.9054 36.919L14.6981 52.4652C13.1686 54.2502 10.5231 54.4577 8.74554 52.9218C6.98871 51.4066 6.78204 48.7084 8.29086 46.9233ZM28.6098 47.3098C39.4227 55.9499 52.3664 60.7243 66.0599 60.7243C84.3681 60.7243 101.402 51.8192 113.104 37.9591C116.687 33.6974 116.672 27.2944 113.08 23.0438C100.801 8.58844 84.1057 0.307266 66.0599 0.307266C52.3707 0.307266 39.4243 5.06439 28.6063 13.7176L20.1508 3.76654C17.2688 0.494884 13.476 -0.136494 10.869 0.0223503C9.55831 0.102215 8.35268 0.378769 7.32846 0.740433C6.1197 1.16726 4.97045 1.77889 3.99434 2.61515C-0.796738 6.7551 -1.36906 13.9985 2.77293 18.8329L12.6921 30.5084L2.74133 42.2358C-1.31221 47.0314 -0.802719 54.2743 3.99434 58.4164C8.75052 62.5295 16.1286 61.9602 20.2161 57.1899L28.6098 47.3098Z" fill="#A3E635"/>
      <path d="M140.328 5.62295V55.7184H131.553V5.62295H140.328ZM151.434 34.4056H137.655V27.0043H150.954C153.376 27.0043 155.227 26.4104 156.507 25.2225C157.787 23.989 158.426 22.2529 158.426 20.0143C158.426 17.867 157.764 16.2223 156.438 15.0801C155.113 13.9379 153.193 13.3668 150.68 13.3668H137.38V5.62295H151.434C156.415 5.62295 160.323 6.83364 163.157 9.25504C165.99 11.6764 167.407 14.9887 167.407 19.1919C167.407 22.2072 166.676 24.7428 165.213 26.7987C163.751 28.809 161.58 30.2709 158.701 31.1847V30.2252C161.808 30.9562 164.162 32.3268 165.762 34.337C167.361 36.3473 168.161 38.9514 168.161 42.1495C168.161 44.9821 167.521 47.4263 166.242 49.4822C164.962 51.4924 163.088 53.0458 160.62 54.1422C158.198 55.193 155.273 55.7184 151.845 55.7184H137.38V47.9745H151.434C153.948 47.9745 155.867 47.3806 157.192 46.1927C158.518 45.0049 159.18 43.2916 159.18 41.053C159.18 38.9514 158.495 37.3295 157.124 36.1874C155.798 34.9995 153.902 34.4056 151.434 34.4056Z" fill="white"/>
      <path d="M196.225 21.7275V29.4714H193.14C190.078 29.4714 187.678 30.2938 185.942 31.9385C184.205 33.5375 183.337 35.9818 183.337 39.2712V55.7184H174.973V21.9331H182.857L183.542 28.9232H182.72C183.177 26.6845 184.251 24.8571 185.942 23.4408C187.633 22.0245 189.826 21.3163 192.523 21.3163C193.117 21.3163 193.711 21.3392 194.305 21.3849C194.899 21.4305 195.539 21.5448 196.225 21.7275Z" fill="white"/>
      <path d="M210.624 56.6093C207.06 56.6093 204.226 55.6499 202.124 53.7311C200.067 51.7665 199.039 49.2081 199.039 46.0557C199.039 42.949 200.113 40.4819 202.261 38.6544C204.455 36.7813 207.562 35.6848 211.584 35.365L221.73 34.5426V33.7888C221.73 32.2355 221.433 31.0019 220.839 30.0882C220.29 29.1288 219.491 28.4435 218.44 28.0323C217.388 27.5754 216.154 27.347 214.738 27.347C212.27 27.347 210.373 27.8495 209.048 28.8546C207.722 29.8141 207.06 31.1847 207.06 32.9664H199.93C199.93 30.4994 200.547 28.3749 201.781 26.5931C203.061 24.7657 204.843 23.3494 207.128 22.3443C209.459 21.3392 212.133 20.8366 215.149 20.8366C218.211 20.8366 220.839 21.3849 223.033 22.4813C225.226 23.5321 226.917 25.1312 228.106 27.2784C229.294 29.38 229.888 32.007 229.888 35.1594V55.7184H222.553L221.936 50.7157C221.205 52.4518 219.788 53.8681 217.685 54.9646C215.629 56.0611 213.275 56.6093 210.624 56.6093ZM213.298 50.3046C215.903 50.3046 217.96 49.5736 219.468 48.1116C221.022 46.6496 221.799 44.6166 221.799 42.0124V40.2306L214.738 40.7789C212.133 41.0073 210.282 41.5555 209.185 42.4236C208.088 43.246 207.539 44.3424 207.539 45.713C207.539 47.2207 208.042 48.3629 209.048 49.1395C210.053 49.9162 211.47 50.3046 213.298 50.3046Z" fill="white"/>
      <path d="M238.104 55.7184V21.8646H246.468V55.7184H238.104ZM242.218 15.0801C240.801 15.0801 239.59 14.6004 238.584 13.641C237.624 12.6359 237.145 11.4252 237.145 10.0089C237.145 8.59258 237.624 7.40473 238.584 6.44531C239.59 5.48589 240.801 5.00618 242.218 5.00618C243.634 5.00618 244.823 5.48589 245.782 6.44531C246.788 7.40473 247.291 8.59258 247.291 10.0089C247.291 11.4252 246.788 12.6359 245.782 13.641C244.823 14.6004 243.634 15.0801 242.218 15.0801Z" fill="white"/>
      <path d="M263.473 55.7184H255.109V21.8646H262.856L263.541 26.2505C264.592 24.5601 266.078 23.2352 267.997 22.2758C269.962 21.3163 272.088 20.8366 274.373 20.8366C278.623 20.8366 281.822 22.093 283.97 24.6058C286.164 27.1185 287.261 30.545 287.261 34.8853V55.7184H278.897V36.8727C278.897 34.0401 278.257 31.9385 276.978 30.5679C275.698 29.1516 273.961 28.4435 271.768 28.4435C269.163 28.4435 267.129 29.2658 265.666 30.9105C264.204 32.5553 263.473 34.7482 263.473 37.4894V55.7184Z" fill="white"/>
      <path d="M292.119 21.8646H327.493V28.8546H292.119V21.8646ZM312.959 5.07471V12.2018C312.457 12.2018 311.954 12.2018 311.451 12.2018C310.994 12.2018 310.514 12.2018 310.012 12.2018C308.138 12.2018 306.881 12.7044 306.241 13.7095C305.601 14.7146 305.281 16.0624 305.281 17.7528V55.7184H296.986V17.7528C296.986 14.6461 297.466 12.1561 298.426 10.283C299.431 8.36415 300.803 6.9707 302.539 6.10266C304.322 5.18892 306.355 4.73206 308.641 4.73206C309.326 4.73206 310.034 4.7549 310.766 4.80058C311.497 4.84627 312.228 4.93764 312.959 5.07471ZM319.129 55.7184V21.8646H327.493V55.7184H319.129ZM323.311 14.943C321.894 14.943 320.706 14.4633 319.746 13.5039C318.787 12.5445 318.307 11.3566 318.307 9.94034C318.307 8.56974 318.787 7.40473 319.746 6.44531C320.706 5.48589 321.894 5.00618 323.311 5.00618C324.682 5.00618 325.848 5.48589 326.807 6.44531C327.767 7.40473 328.247 8.56974 328.247 9.94034C328.247 11.3566 327.767 12.5445 326.807 13.5039C325.848 14.4633 324.682 14.943 323.311 14.943Z" fill="white"/>
      <path d="M333.51 45.4389H341.462C341.508 46.9009 342.057 48.0659 343.108 48.9339C344.159 49.802 345.621 50.236 347.495 50.236C349.506 50.236 351.014 49.8705 352.02 49.1395C353.071 48.4086 353.596 47.4263 353.596 46.1927C353.596 45.3704 353.322 44.6394 352.774 43.9998C352.225 43.3602 351.197 42.8805 349.689 42.5607L343.588 41.1215C340.525 40.4362 338.24 39.3397 336.732 37.8321C335.27 36.2787 334.538 34.1543 334.538 31.4588C334.538 29.2658 335.11 27.3698 336.252 25.7708C337.441 24.1718 339.04 22.9611 341.051 22.1387C343.062 21.2706 345.37 20.8366 347.975 20.8366C350.489 20.8366 352.705 21.2935 354.625 22.2072C356.544 23.121 358.03 24.4002 359.081 26.0449C360.178 27.6896 360.749 29.6085 360.795 31.8014H352.842C352.842 30.3395 352.385 29.1973 351.471 28.3749C350.557 27.5069 349.278 27.0729 347.632 27.0729C345.987 27.0729 344.707 27.4384 343.793 28.1693C342.879 28.9003 342.422 29.8826 342.422 31.1161C342.422 32.9893 343.885 34.2685 346.81 34.9538L352.911 36.3929C355.744 37.0326 357.87 38.0605 359.286 39.4768C360.749 40.8931 361.48 42.9033 361.48 45.5075C361.48 47.7918 360.886 49.7792 359.698 51.4696C358.509 53.1143 356.841 54.3935 354.693 55.3073C352.545 56.1753 350.077 56.6093 347.289 56.6093C343.085 56.6093 339.726 55.5814 337.212 53.5255C334.744 51.4696 333.51 48.774 333.51 45.4389Z" fill="white"/>
      <path d="M376.212 55.7184H367.848V4.73206H376.28V26.2505C377.331 24.6058 378.794 23.3037 380.668 22.3443C382.587 21.3392 384.781 20.8366 387.249 20.8366C391.408 20.8366 394.561 22.093 396.709 24.6058C398.903 27.1185 400 30.545 400 34.8853V55.7184H391.636V36.8727C391.636 34.9538 391.339 33.3776 390.745 32.1441C390.151 30.9105 389.328 29.9968 388.277 29.4029C387.226 28.7633 385.992 28.4435 384.575 28.4435C382.839 28.4435 381.33 28.8318 380.051 29.6085C378.817 30.3395 377.857 31.3674 377.172 32.6923C376.532 34.0172 376.212 35.5249 376.212 37.2153V55.7184Z" fill="white"/>
    </svg>
  </a>
  <span class="nav-badge">MCP Server · Live</span>
</nav>

<section class="hero">
  <div class="hero-eyebrow">Model Context Protocol</div>
  <h1>Your knowledge base,<br/><span>inside your AI tools</span></h1>
  <p class="hero-sub">Connect Cursor, Claude Desktop, and VS Code Copilot directly to your Brainfish knowledge base — search, create, and manage content without leaving your editor.</p>
  <div class="endpoint-pill" onclick="navigator.clipboard.writeText('https://mcp.brainfi.sh').then(()=>{this.querySelector('.copy-hint').textContent='Copied!';setTimeout(()=>{this.querySelector('.copy-hint').textContent='click to copy'},1500)})">
    <span class="dot"></span>
    https://mcp.brainfi.sh
    <span class="copy-hint">click to copy</span>
  </div>
  <div class="hero-actions">
    <a class="btn btn-primary" href="https://app.brainfi.sh" target="_blank" rel="noopener">Get API Token</a>
    <a class="btn btn-secondary" href="https://github.com/brainfish-ai/brainfish-mcp-server" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>
      View on GitHub
    </a>
  </div>
</section>

<main>
  <div class="section">
    <div class="section-label">Quick setup</div>

    <div class="setup-tabs">
      <button class="setup-tab active" onclick="switchTab(this,'cursor')">Cursor / Claude Desktop</button>
      <button class="setup-tab" onclick="switchTab(this,'claude')">Claude.ai Web</button>
    </div>

    <div id="setup-cursor" class="setup-panel active">
    <div class="monaco-editor">
      <div class="monaco-titlebar">
        <div class="monaco-dots">
          <span class="monaco-dot red"></span>
          <span class="monaco-dot yellow"></span>
          <span class="monaco-dot green"></span>
        </div>
      </div>
      <div class="monaco-tabs">
        <div class="monaco-tab">
          <span class="monaco-tab-icon">&#9632;</span>
          mcp.json
        </div>
      </div>
      <div class="monaco-body">
        <div class="monaco-gutter">
          <span class="active">1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
          <span>7</span>
          <span>8</span>
          <span>9</span>
          <span>10</span>
          <span>11</span>
        </div>
        <div class="monaco-code">
          <pre><span class="tok-brace">{</span>
  <span class="tok-key">"mcpServers"</span><span class="tok-brace">: {</span>
    <span class="tok-key">"brainfish"</span><span class="tok-brace">: {</span>
      <span class="tok-key">"url"</span><span class="tok-brace">:</span> <span class="tok-str">"https://mcp.brainfi.sh"</span><span class="tok-brace">,</span>
      <span class="tok-key">"headers"</span><span class="tok-brace">: {</span>
        <span class="tok-key">"Authorization"</span><span class="tok-brace">:</span> <span class="tok-str">"Bearer bf_api_YOUR_TOKEN"</span><span class="tok-brace">,</span>
        <span class="tok-key">"agent-key"</span><span class="tok-brace">:</span>     <span class="tok-str">"YOUR_AGENT_KEY"</span>  <span class="tok-comment">// optional</span>
      <span class="tok-brace">}</span>
    <span class="tok-brace">}</span>
  <span class="tok-brace">}</span>
<span class="tok-brace">}</span></pre>
        </div>
      </div>
      <div class="monaco-statusbar">
        <div class="monaco-statusbar-left">
          <span>&#10003; mcp.json</span>
          <span>JSON</span>
        </div>
        <div class="monaco-statusbar-right">
          <span>Ln 1, Col 1</span>
          <button class="monaco-copy-btn" onclick="const code=this.closest('.monaco-editor').querySelector('pre').innerText;navigator.clipboard.writeText(code).then(()=>{this.textContent='Copied!';setTimeout(()=>{this.textContent='Copy'},1500)})">Copy</button>
        </div>
      </div>
      </div>
    </div>
    </div><!-- end setup-cursor -->

    <div id="setup-claude" class="setup-panel">
      <div class="claude-setup">
        <div class="claude-steps">
          <div class="claude-step">
            <span class="step-num">1</span>
            <div class="step-body">
              <div class="step-title">Open Claude.ai → Settings → Integrations</div>
              <div class="step-desc">Go to <a href="https://claude.ai/settings/integrations" target="_blank" rel="noopener">claude.ai/settings/integrations</a> and click <strong>Add custom connector</strong>.</div>
            </div>
          </div>
          <div class="claude-step">
            <span class="step-num">2</span>
            <div class="step-body">
              <div class="step-title">Enter a name and URL with your token</div>
              <div class="step-desc">Claude.ai doesn't support custom headers, so pass your API token directly in the URL:</div>
              <div class="claude-url-block" onclick="navigator.clipboard.writeText('https://mcp.brainfi.sh?token=bf_api_YOUR_TOKEN').then(()=>{this.querySelector('.url-copy').textContent='Copied!';setTimeout(()=>{this.querySelector('.url-copy').textContent='copy'},1500)})">
                <code>https://mcp.brainfi.sh?token=<span class="url-token">bf_api_YOUR_TOKEN</span></code>
                <span class="url-copy">copy</span>
              </div>
              <div class="step-desc" style="margin-top:.5rem">Optionally append <code class="inline-code">&amp;agent-key=YOUR_AGENT_KEY</code> if using AI Answers.</div>
            </div>
          </div>
          <div class="claude-step">
            <span class="step-num">3</span>
            <div class="step-body">
              <div class="step-title">Click Add — that's it</div>
              <div class="step-desc">No OAuth required. Claude will immediately discover all 22 Brainfish tools.</div>
            </div>
          </div>
        </div>
        <div class="claude-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          Credentials are embedded in the URL on your device only. Use a token with the minimum permissions your workflow needs.
        </div>
      </div>
    </div><!-- end setup-claude -->

  <div class="section">
    <div class="section-label">${Object.keys(TOOLS).length} available tools across ${Object.keys(toolGroups).length} categories</div>
    <div class="tool-groups">${toolGroupsHtml}</div>
  </div>

  <div class="security-note">
    <div class="security-icon">🔒</div>
    <p><strong>Your credentials stay private.</strong> Tokens are forwarded directly to the Brainfish API on each request. This server never stores, logs, or caches your API keys.</p>
  </div>
</main>

<footer>
  <p>Built by <a href="https://brainfi.sh" target="_blank" rel="noopener">Brainfish</a> · <a href="https://github.com/brainfish-ai/brainfish-mcp-server" target="_blank" rel="noopener">Open source on GitHub</a></p>
</footer>

<script>
function switchTab(btn, panel) {
  document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('setup-' + panel).classList.add('active');
}
</script>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  return NextResponse.json({
    name: 'Brainfish MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for Brainfish knowledge base management',
    endpoint: 'https://mcp.brainfi.sh',
    tools: Object.keys(TOOLS)
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, agent-key, x-brainfish-api-key, x-api-key',
    },
  });
}
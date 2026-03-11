import { NextRequest, NextResponse } from 'next/server';
import { BrainfishClient, BrainfishApiError } from '../../../src/client.js';
import type { BrainfishSessionData } from '../../../src/types.js';

function extractBrainfishCredentials(request: NextRequest): { 
  apiToken?: string; 
  agentKey?: string; 
} {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-brainfish-api-key') || request.headers.get('x-api-key');
  const agentKey = request.headers.get('agent-key') || undefined;

  let apiToken: string | undefined;

  if (apiKeyHeader) {
    apiToken = apiKeyHeader;
  } else if (authHeader?.toLowerCase().startsWith('bearer ')) {
    apiToken = authHeader.slice(7).trim();
  }

  return { apiToken, agentKey };
}

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
  id: string | number;
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
  try {
    const body: MCPRequest = await request.json();
    
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
        }, { status: 400 });
    }
  } catch (error) {
    console.error('MCP Server Error:', error);
    return handleBrainfishError(error);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: 'Brainfish MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for Brainfish knowledge base management',
    endpoints: {
      mcp: '/api/mcp'
    },
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
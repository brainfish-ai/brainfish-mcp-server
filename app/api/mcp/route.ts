import { NextRequest, NextResponse } from 'next/server';
import { BrainfishClient, BrainfishApiError } from '../../../src/client';
import type { BrainfishSessionData } from '../../../src/types';

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
    const tools = Object.keys(TOOLS);
    const toolCards = tools.map(t => {
      const label = t.replace('brainfish_', '').replace(/_/g, ' ');
      return `<div class="tool-card"><span class="tool-name">${label}</span></div>`;
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
      gap: .625rem;
      text-decoration: none;
    }
    .logo svg { flex-shrink: 0; }
    .logo-text {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -.02em;
    }
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

    /* Code block */
    .code-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,.03);
    }
    .code-lang {
      font-size: .6875rem;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    .copy-btn {
      font-size: .6875rem;
      font-weight: 600;
      color: var(--text-muted);
      background: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: .25rem .625rem;
      cursor: pointer;
      transition: color .15s, border-color .15s;
    }
    .copy-btn:hover { color: var(--brand); border-color: var(--brand); }
    pre {
      padding: 1.25rem;
      font-family: 'SFMono-Regular', 'Consolas', 'Monaco', monospace;
      font-size: .8125rem;
      line-height: 1.7;
      overflow-x: auto;
      color: #e5e5e5;
    }
    .tok-key { color: #a3e635; }
    .tok-str { color: #fbbf24; }
    .tok-punc { color: #737373; }
    .tok-comment { color: #525252; font-style: italic; }

    /* Tools grid */
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: .5rem;
    }
    .tool-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: .625rem .875rem;
      transition: border-color .15s, background .15s;
    }
    .tool-card:hover { border-color: rgba(163,230,53,.3); background: var(--brand-dim); }
    .tool-name {
      font-size: .75rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: capitalize;
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
    <svg width="32" height="22" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 16 Q16 2 36 16 Q16 30 6 16Z" stroke="#a3e635" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <path d="M6 16 L0 7" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M6 16 L0 25" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="13" r="2" fill="#a3e635"/>
    </svg>
    <span class="logo-text">Brainfish</span>
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
    <div class="code-block">
      <div class="code-header">
        <span class="code-lang">JSON — Cursor / Claude Desktop</span>
        <button class="copy-btn" onclick="const t=this.closest('.code-block').querySelector('pre').innerText;navigator.clipboard.writeText(t).then(()=>{this.textContent='Copied!';setTimeout(()=>{this.textContent='Copy'},1500)})">Copy</button>
      </div>
      <pre><span class="tok-punc">{</span>
  <span class="tok-key">"mcpServers"</span><span class="tok-punc">: {</span>
    <span class="tok-key">"brainfish"</span><span class="tok-punc">: {</span>
      <span class="tok-key">"url"</span><span class="tok-punc">:</span> <span class="tok-str">"https://mcp.brainfi.sh"</span><span class="tok-punc">,</span>
      <span class="tok-key">"headers"</span><span class="tok-punc">: {</span>
        <span class="tok-key">"Authorization"</span><span class="tok-punc">:</span> <span class="tok-str">"Bearer bf_api_YOUR_TOKEN"</span><span class="tok-punc">,</span>
        <span class="tok-key">"agent-key"</span><span class="tok-punc">:</span>     <span class="tok-str">"YOUR_AGENT_KEY"</span>  <span class="tok-comment">// optional</span>
      <span class="tok-punc">}</span>
    <span class="tok-punc">}</span>
  <span class="tok-punc">}</span>
<span class="tok-punc">}</span></pre>
    </div>
  </div>

  <div class="section">
    <div class="section-label">${tools.length} available tools</div>
    <div class="tools-grid">${toolCards}</div>
  </div>

  <div class="security-note">
    <div class="security-icon">🔒</div>
    <p><strong>Your credentials stay private.</strong> Tokens are forwarded directly to the Brainfish API on each request. This server never stores, logs, or caches your API keys.</p>
  </div>
</main>

<footer>
  <p>Built by <a href="https://brainfi.sh" target="_blank" rel="noopener">Brainfish</a> · <a href="https://github.com/brainfish-ai/brainfish-mcp-server" target="_blank" rel="noopener">Open source on GitHub</a></p>
</footer>

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
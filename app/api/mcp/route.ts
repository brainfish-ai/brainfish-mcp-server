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
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
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
              tools: {}
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
        
      case 'tools/call':
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
import { NextRequest, NextResponse } from 'next/server';
import {
  extractBrainfishCredentials,
  WWW_AUTHENTICATE,
} from '../lib/credentials';
import { handleBrainfishError } from '../lib/errors';
import type { MCPRequest } from '../lib/mcp-types';
import { redactSensitiveArgs } from '../lib/redact';
import { handleResourceRead } from '../lib/resource-read';
import { TOOLS } from '../lib/tools';
import { handleToolCall } from '../lib/tool-call';

export async function POST(request: NextRequest) {
  // OAuth 2.1: return 401 with discovery hint when no credentials provided
  const { apiToken } = extractBrainfishCredentials(request.headers);
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
        try {
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
        } catch (toolError) {
          const safeArgs = redactSensitiveArgs(args);
          console.error(`MCP tool error [${name}]:`, toolError, '\nArguments:', JSON.stringify(safeArgs));
          return handleBrainfishError(toolError);
        }
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

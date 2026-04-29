import { NextRequest, NextResponse } from 'next/server';
import { TOOLS } from '../lib/tools';

export async function GET(request: NextRequest) {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    const dest = new URL('/mcp', request.nextUrl.origin);
    return NextResponse.redirect(dest, 307);
  }

  return NextResponse.json({
    name: 'Brainfish MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for Brainfish knowledge base management',
    endpoint: 'https://mcp.brainfi.sh',
    tools: Object.keys(TOOLS),
  });
}

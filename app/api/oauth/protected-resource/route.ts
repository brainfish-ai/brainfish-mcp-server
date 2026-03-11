import { NextResponse } from 'next/server';

const BASE = 'https://mcp.brainfi.sh';

// RFC 9728 — OAuth 2.0 Protected Resource Metadata
// Claude reads this to discover which authorization_servers handle this resource.
export async function GET() {
  return NextResponse.json({
    resource: BASE,
    authorization_servers: [BASE],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header'],
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

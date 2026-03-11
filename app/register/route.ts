import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// OAuth 2.0 Dynamic Client Registration (RFC 7591)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientId = crypto.randomUUID();

    return NextResponse.json(
      {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        token_endpoint_auth_method: 'none',
        grant_types: body.grant_types ?? ['authorization_code'],
        response_types: body.response_types ?? ['code'],
        redirect_uris: body.redirect_uris ?? [],
        client_name: body.client_name ?? 'MCP Client',
        scope: 'mcp',
      },
      { status: 201, headers: CORS }
    );
  } catch {
    return NextResponse.json(
      { error: 'invalid_client_metadata' },
      { status: 400, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

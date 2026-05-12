import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

async function verifySHA256(verifier: string, challenge: string): Promise<boolean> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return base64url === challenge;
}

// OAuth 2.1 Token Endpoint — authorization_code grant with PKCE
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  let params: URLSearchParams;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    params = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]));
  } else {
    params = new URLSearchParams(await request.text());
  }

  if (params.get('grant_type') !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400, headers: CORS });
  }

  const code = params.get('code');
  const codeVerifier = params.get('code_verifier') ?? '';

  if (!code) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'code is required' }, { status: 400, headers: CORS });
  }

  let payload: { token: string; challenge: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(code, 'base64url').toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers: CORS });
  }

  if (Date.now() > payload.exp) {
    return NextResponse.json({ error: 'invalid_grant', error_description: 'Authorization code expired' }, { status: 400, headers: CORS });
  }

  if (payload.challenge) {
    if (!codeVerifier) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'code_verifier required' }, { status: 400, headers: CORS });
    }
    const valid = await verifySHA256(codeVerifier, payload.challenge);
    if (!valid) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400, headers: CORS });
    }
  }

  // Encode Brainfish credentials into the access token (Bearer value)
  const tokenData = { token: payload.token };
  const accessToken = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 31536000,
    scope: 'mcp',
  }, { status: 200, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

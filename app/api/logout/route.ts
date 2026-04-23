import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_API = process.env.BRAINFISH_API_URL || 'https://api.brainfi.sh';

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('accessToken')?.value ?? '';

  // Tell the platform to rotate the JWT secret, invalidating all existing tokens.
  if (sessionToken) {
    await fetch(`${PLATFORM_API}/api/auth.delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    }).catch(() => null); // best-effort — clear cookie regardless
  }

  // Clear the accessToken cookie by returning a Set-Cookie header with Max-Age=0.
  const res = NextResponse.json({ success: true });
  res.cookies.set('accessToken', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  return res;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

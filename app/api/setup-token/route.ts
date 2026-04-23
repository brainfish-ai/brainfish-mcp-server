import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_API = process.env.BRAINFISH_API_URL || 'https://api.brainfi.sh';

export async function POST(request: NextRequest) {
  try {
    // Prefer an explicit API key from the request body, otherwise fall back to the
    // shared accessToken cookie that the platform sets on .brainfi.sh so that users
    // who are already logged in get a seamless zero-input experience.
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const explicitKey = ((body.apiKey as string) ?? '').trim();
    const sessionToken = request.cookies.get('accessToken')?.value ?? '';

    const bearerToken = explicitKey || sessionToken;

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in to Brainfish and try again.', unauthenticated: true },
        { status: 401 }
      );
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`,
    };

    // Create a dedicated "Cursor MCP" API key using the authenticated session.
    const keyRes = await fetch(`${PLATFORM_API}/api/apiKeys.create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Cursor MCP' }),
    });

    if (!keyRes.ok) {
      const err = await keyRes.json().catch(() => ({})) as Record<string, unknown>;

      if (keyRes.status === 401 || keyRes.status === 403) {
        return NextResponse.json(
          { error: 'Session expired or invalid. Please log in to Brainfish again.', unauthenticated: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: (err.message as string) || 'Failed to create API key.' },
        { status: keyRes.status }
      );
    }

    const keyData = await keyRes.json() as Record<string, unknown>;
    const keyPayload = (keyData.data ?? keyData) as Record<string, unknown>;
    // presentApiKey exposes the raw token as `secret` (server/presenters/apiKey.ts)
    const apiToken = keyPayload.secret as string | undefined;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'API key was created but the token value could not be read.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ apiToken });
  } catch (error) {
    console.error('[setup-token] unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
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

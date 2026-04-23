import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_API = process.env.BRAINFISH_API_URL || 'https://api.brainfi.sh';
const MCP_KEY_NAME = 'Brainfish MCP';

export async function POST(request: NextRequest) {
  try {
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

    // Step 1: List existing API keys (try both GET and POST — platform may vary).
    let existingKeys: Array<Record<string, unknown>> = [];

    for (const method of ['POST', 'GET'] as const) {
      const url = `${PLATFORM_API}/api/apiKeys.list`;
      console.log(`[setup-token] LIST attempt: ${method} ${url}`);

      const listRes = await fetch(url, {
        method,
        headers: authHeaders,
        ...(method === 'POST' ? { body: JSON.stringify({}) } : {}),
      });

      console.log(`[setup-token] LIST response: ${listRes.status}`);
      const listText = await listRes.clone().text();
      console.log(`[setup-token] LIST body:`, listText.slice(0, 300));

      if (listRes.status === 401 || listRes.status === 403) {
        return NextResponse.json(
          { error: 'Session expired or invalid. Please log in to Brainfish again.', unauthenticated: true },
          { status: 401 }
        );
      }

      if (listRes.ok) {
        const listData = await listRes.json() as Record<string, unknown>;
        existingKeys = (listData.data ?? []) as Array<Record<string, unknown>>;
        console.log(`[setup-token] Found ${existingKeys.length} keys, names:`, existingKeys.map(k => k.name));
        break;
      }
    }

    // Step 2: Find any existing "Cursor MCP" keys.
    const mcpKeys = existingKeys.filter((k) => k.name === MCP_KEY_NAME);

    // Step 3: If one exists and already has a secret, reuse it immediately.
    if (mcpKeys.length === 1 && mcpKeys[0].secret) {
      return NextResponse.json({ apiToken: mcpKeys[0].secret as string });
    }

    // Step 4: Delete all existing "Cursor MCP" keys so we don't accumulate duplicates,
    // then create exactly one fresh key (which always returns its secret on creation).
    await Promise.all(
      mcpKeys.map(async (k) => {
        const delUrl = `${PLATFORM_API}/api/apiKeys.delete`;
        console.log(`[setup-token] DELETE ${delUrl} id=${k.id}`);
        const delRes = await fetch(delUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ id: k.id }),
        }).catch(() => null);
        console.log(`[setup-token] DELETE response: ${delRes?.status}`);
      })
    );

    // Step 5: Create the single authoritative "Cursor MCP" key.
    const createUrl = `${PLATFORM_API}/api/apiKeys.create`;
    console.log(`[setup-token] CREATE ${createUrl}`);
    const keyRes = await fetch(createUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: MCP_KEY_NAME }),
    });

    console.log(`[setup-token] CREATE response: ${keyRes.status}`);
    const createText = await keyRes.clone().text();
    console.log(`[setup-token] CREATE body:`, createText.slice(0, 300));

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

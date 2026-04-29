import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BrainfishApiError, BrainfishClient } from '@/src/client';
import { WWW_AUTHENTICATE } from './lib/credentials';
import { GET, OPTIONS, POST } from './route';

vi.mock('@/src/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/src/client')>();
  return { ...mod, BrainfishClient: vi.fn() };
});

function authHeaders(token = 'bf_test_token') {
  return { 'x-brainfish-api-key': token };
}

function mcpPost(
  body: unknown,
  extraHeaders?: Record<string, string>,
): NextRequest {
  return new NextRequest('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

function mockClientInstance(opts?: {
  validateToken?: ReturnType<typeof vi.fn>;
  listCollections?: ReturnType<typeof vi.fn>;
  searchDocuments?: ReturnType<typeof vi.fn>;
}) {
  const validateToken =
    opts?.validateToken ?? vi.fn().mockResolvedValue({ ok: true });
  const listCollections =
    opts?.listCollections ?? vi.fn().mockResolvedValue([]);
  const searchDocuments =
    opts?.searchDocuments ??
    vi.fn().mockRejectedValue(new Error('search failed'));

  return class MockBrainfishClient {
    validateToken = validateToken;
    listCollections = listCollections;
    searchDocuments = searchDocuments;
  } as unknown as typeof BrainfishClient;
}

describe('POST /api/mcp', () => {
  beforeEach(() => {
    vi.mocked(BrainfishClient).mockImplementation(mockClientInstance());
  });

  it('returns 401 JSON-RPC error and WWW-Authenticate when no credentials', async () => {
    const req = new NextRequest('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe(WWW_AUTHENTICATE);
    const json = await res.json();
    expect(json).toEqual({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Authentication required' },
    });
  });

  it('returns 202 with empty body for JSON-RPC notifications (no id)', async () => {
    const req = mcpPost({
      jsonrpc: '2.0',
      method: 'notifications/cancelled',
      params: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    expect(await res.text()).toBe('');
  });

  it('handles initialize', async () => {
    const res = await POST(
      mcpPost({ jsonrpc: '2.0', id: 'a1', method: 'initialize' }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      jsonrpc: '2.0',
      id: 'a1',
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'brainfish-mcp-server', version: '1.0.0' },
      },
    });
    expect(json.result.capabilities).toEqual({ tools: {}, resources: {} });
  });

  it('handles tools/list with tool definitions', async () => {
    const res = await POST(
      mcpPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jsonrpc).toBe('2.0');
    expect(json.id).toBe(2);
    expect(Array.isArray(json.result.tools)).toBe(true);
    expect(json.result.tools.length).toBeGreaterThan(0);
    for (const t of json.result.tools) {
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('inputSchema');
    }
  });

  it('handles tools/call via mocked BrainfishClient', async () => {
    const res = await POST(
      mcpPost({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'brainfish_validate_token',
          arguments: {},
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.content[0].type).toBe('text');
    expect(JSON.parse(json.result.content[0].text)).toEqual({ ok: true });
  });

  it('returns handleBrainfishError shape for BrainfishApiError from tools/call', async () => {
    vi.mocked(BrainfishClient).mockImplementation(
      mockClientInstance({
        validateToken: vi
          .fn()
          .mockRejectedValue(
            new BrainfishApiError('rate_limited', 'Slow down', 429),
          ),
      }),
    );
    const res = await POST(
      mcpPost({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'brainfish_validate_token',
          arguments: {},
        },
      }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      error: 'rate_limited',
      message: 'Slow down',
      statusCode: 429,
    });
  });

  it('logs redacted arguments when tools/call throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(
      mcpPost({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'brainfish_search_documents',
          arguments: { query: 'super-secret', limit: 3 },
        },
      }),
    );
    expect(res.status).toBe(500);
    const logged = spy.mock.calls.flat().join('\n');
    expect(logged).not.toContain('super-secret');
    expect(logged).toContain('[redacted, 12 chars]');
    spy.mockRestore();
  });

  it('handles resources/list', async () => {
    const res = await POST(
      mcpPost({ jsonrpc: '2.0', id: 6, method: 'resources/list' }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.resources).toHaveLength(5);
    expect(json.result.resources[0].uri).toBe('brainfish://collections');
  });

  it('handles resources/read with mocked listCollections', async () => {
    const res = await POST(
      mcpPost({
        jsonrpc: '2.0',
        id: 7,
        method: 'resources/read',
        params: { uri: 'brainfish://collections' },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(json.result.contents[0].text)).toEqual([]);
  });

  it('returns JSON-RPC method not found for unknown method', async () => {
    const res = await POST(
      mcpPost({
        jsonrpc: '2.0',
        id: 8,
        method: 'does_not_exist',
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      jsonrpc: '2.0',
      id: 8,
      error: {
        code: -32601,
        message: 'Method not found: does_not_exist',
      },
    });
  });
});

describe('GET /api/mcp', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns JSON metadata when Accept does not include text/html', async () => {
    const req = new NextRequest('http://localhost/api/mcp', {
      headers: { accept: 'application/json' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      name: 'Brainfish MCP Server',
      version: '1.0.0',
      endpoint: 'https://mcp.brainfi.sh',
    });
    expect(Array.isArray(json.tools)).toBe(true);
    expect(json.tools).toContain('brainfish_search_documents');
  });

  it('redirects to /mcp when Accept includes text/html', async () => {
    const req = new NextRequest('http://localhost/api/mcp', {
      headers: { accept: 'text/html' },
    });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/mcp');
  });
});

describe('OPTIONS /api/mcp', () => {
  it('returns CORS headers', async () => {
    const res = await OPTIONS(
      new NextRequest('http://localhost/api/mcp', { method: 'OPTIONS' }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, OPTIONS',
    );
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type, Authorization, agent-key, x-brainfish-api-key, x-api-key',
    );
  });
});

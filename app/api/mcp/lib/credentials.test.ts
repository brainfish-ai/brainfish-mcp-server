import { describe, expect, it } from 'vitest';
import { extractBrainfishCredentials, WWW_AUTHENTICATE } from './credentials';

function oauthBearer(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

describe('WWW_AUTHENTICATE', () => {
  it('is the OAuth protected-resource discovery hint', () => {
    expect(WWW_AUTHENTICATE).toBe(
      'Bearer realm="https://mcp.brainfi.sh", resource_metadata="https://mcp.brainfi.sh/.well-known/oauth-protected-resource"',
    );
  });
});

describe('extractBrainfishCredentials', () => {
  it('returns empty when no relevant headers', () => {
    expect(extractBrainfishCredentials(new Headers())).toEqual({});
  });

  it('reads api token from x-brainfish-api-key', () => {
    const h = new Headers({ 'x-brainfish-api-key': 'bf_header' });
    expect(extractBrainfishCredentials(h)).toEqual({
      apiToken: 'bf_header',
    });
  });

  it('falls back to x-api-key when x-brainfish-api-key is absent', () => {
    const h = new Headers({ 'x-api-key': 'bf_legacy' });
    expect(extractBrainfishCredentials(h)).toEqual({
      apiToken: 'bf_legacy',
    });
  });

  it('prefers x-brainfish-api-key over x-api-key when both are set', () => {
    const h = new Headers({
      'x-brainfish-api-key': 'preferred',
      'x-api-key': 'ignored',
    });
    expect(extractBrainfishCredentials(h).apiToken).toBe('preferred');
  });

  it('prefers explicit API key headers over Authorization bearer', () => {
    const h = new Headers({
      'x-brainfish-api-key': 'from_header',
      authorization: `Bearer ${oauthBearer({ token: 'from_oauth' })}`,
    });
    expect(extractBrainfishCredentials(h)).toEqual({
      apiToken: 'from_header',
    });
  });

  it('parses OAuth-style bearer (base64url JSON with token)', () => {
    const bearer = oauthBearer({ token: 'tok' });
    const h = new Headers({ authorization: `Bearer ${bearer}` });
    expect(extractBrainfishCredentials(h)).toEqual({
      apiToken: 'tok',
    });
  });

  it('accepts case-insensitive Bearer scheme', () => {
    const bearer = oauthBearer({ token: 't' });
    const h = new Headers({ authorization: `bearer ${bearer}` });
    expect(extractBrainfishCredentials(h).apiToken).toBe('t');
  });

  it('treats bearer as raw API key when JSON decodes but has no token field', () => {
    const inner = JSON.stringify({ foo: 1 });
    const bearer = Buffer.from(inner).toString('base64url');
    const h = new Headers({ authorization: `Bearer ${bearer}` });
    expect(extractBrainfishCredentials(h).apiToken).toBe(bearer);
  });

  it('treats bearer as raw API key when value is not valid oauth JSON', () => {
    const h = new Headers({ authorization: 'Bearer bf_api_plain_key' });
    expect(extractBrainfishCredentials(h).apiToken).toBe('bf_api_plain_key');
  });

  it('ignores Authorization when it does not start with Bearer', () => {
    const h = new Headers({ authorization: 'Basic abc' });
    expect(extractBrainfishCredentials(h)).toEqual({});
  });
});

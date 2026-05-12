// realm must be a URL; resource_metadata points to RFC 9728 protected-resource doc
// (which lists authorization_servers → Claude follows that chain to discover OAuth)
export const WWW_AUTHENTICATE =
  'Bearer realm="https://mcp.brainfi.sh", resource_metadata="https://mcp.brainfi.sh/.well-known/oauth-protected-resource"';

export function extractBrainfishCredentials(headers: Headers): {
  apiToken?: string;
} {
  const authHeader = headers.get('authorization');
  const apiKeyHeader =
    headers.get('x-brainfish-api-key') || headers.get('x-api-key');

  let apiToken: string | undefined;

  if (apiKeyHeader) {
    apiToken = apiKeyHeader;
  } else if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    try {
      const decoded = JSON.parse(
        Buffer.from(bearer, 'base64url').toString('utf8'),
      );
      if (decoded?.token) {
        apiToken = decoded.token;
      } else {
        apiToken = bearer;
      }
    } catch {
      apiToken = bearer;
    }
  }

  return apiToken ? { apiToken } : {};
}

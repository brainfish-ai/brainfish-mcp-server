import type { NextRequest } from 'next/server';
import { extractBrainfishCredentials } from './credentials';
import { createBrainfishClient } from './brainfish-client';

export async function handleResourceRead(
  uri: string,
  request: NextRequest,
) {
  const { apiToken } = extractBrainfishCredentials(request.headers);
  if (!apiToken) {
    throw new Error('Brainfish API token is required');
  }
  const client = createBrainfishClient({ apiToken });

  if (uri === 'brainfish://collections') {
    const result = await client.listCollections();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  const collectionDocsMatch = uri.match(
    /^brainfish:\/\/collection\/([^/]+)\/documents$/,
  );
  if (collectionDocsMatch) {
    const collectionId = decodeURIComponent(collectionDocsMatch[1]);
    const result = await client.listDocuments({ collectionId });
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  const collectionMatch = uri.match(/^brainfish:\/\/collection\/([^/]+)$/);
  if (collectionMatch) {
    const collectionId = decodeURIComponent(collectionMatch[1]);
    const result = await client.getCollection(collectionId);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  const documentMatch = uri.match(/^brainfish:\/\/document\/([^?]+)$/);
  if (documentMatch) {
    const documentId = decodeURIComponent(documentMatch[1]);
    const result = await client.getDocument(documentId);
    const doc = (result as any)?.data;
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: doc?.text ?? JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (uri.startsWith('brainfish://search')) {
    const searchUrl = new URL(
      uri.replace('brainfish://', 'https://brainfish.internal/'),
    );
    const query = searchUrl.searchParams.get('query');
    if (!query) {
      throw new Error('brainfish://search resource requires a query parameter');
    }
    const collectionId = searchUrl.searchParams.get('collectionId') ?? undefined;
    const result = await client.searchDocuments({ query, collectionId });
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

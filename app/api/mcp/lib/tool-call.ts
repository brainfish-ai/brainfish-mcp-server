import type { NextRequest } from 'next/server';
import { extractBrainfishCredentials } from './credentials';
import { createBrainfishClient } from './brainfish-client';

export async function handleToolCall(
  toolName: string,
  args: any,
  request: NextRequest,
) {
  const { apiToken, agentKey } = extractBrainfishCredentials(request.headers);

  if (!apiToken) {
    throw new Error('Brainfish API token is required');
  }

  const client = createBrainfishClient({ apiToken, agentKey });

  switch (toolName) {
    case 'brainfish_search_documents':
      return await client.searchDocuments(args);

    case 'brainfish_get_document':
      return await client.getDocument(args.id);

    case 'brainfish_generate_answer':
      if (!agentKey) {
        throw new Error(
          'Agent key is required for AI answer generation. Find your agent key in the Brainfish dashboard under Agents.',
        );
      }
      return await client.generateAnswer(args);

    case 'brainfish_list_collections':
      return await client.listCollections(args);

    case 'brainfish_list_documents':
      return await client.listDocuments(args);

    case 'brainfish_validate_token':
      return await client.validateToken();

    case 'brainfish_get_collection':
      return await client.getCollection(args.id);

    case 'brainfish_create_collection': {
      const { ...collectionParams } = args;
      return await client.createCollection(collectionParams);
    }

    case 'brainfish_update_collection': {
      const { id: collectionId, ...collectionUpdateParams } = args;
      return await client.updateCollection(collectionId, collectionUpdateParams);
    }

    case 'brainfish_delete_collection':
      return await client.deleteCollection(args.id);

    case 'brainfish_create_document': {
      const { ...docParams } = args;
      return await client.createDocument(docParams);
    }

    case 'brainfish_update_document': {
      const { id: docId, ...docUpdateParams } = args;
      return await client.updateDocument(docId, docUpdateParams);
    }

    case 'brainfish_delete_document':
      return await client.deleteDocument(args.id, args.permanent ?? false);

    case 'brainfish_generate_article_suggestion':
      return await client.generateArticleSuggestion(args);

    case 'brainfish_generate_follow_ups':
      if (!agentKey) {
        throw new Error(
          'Agent key is required for follow-up generation. Find your agent key in the Brainfish dashboard under Agents.',
        );
      }
      return await client.generateFollowUpQuestions(
        args.conversationId,
        args.limit,
      );

    case 'brainfish_list_catalogs':
      return await client.listCatalogs(args);

    case 'brainfish_create_catalog': {
      const { ...catalogParams } = args;
      return await client.createCatalog(catalogParams);
    }

    case 'brainfish_get_catalog':
      return await client.getCatalog(args.id);

    case 'brainfish_sync_catalog_content':
      return await client.syncCatalogContent(args.id, args.files);

    case 'brainfish_search_sessions': {
      const { includeTurns = true, ...searchParams } = args;
      return await client.searchSessions({ ...searchParams, includeTurns });
    }

    case 'brainfish_get_session':
      return await client.getSession(args.id);

    case 'brainfish_get_session_timeline': {
      const { id: timelineId, ...timelineParams } = args;
      return await client.getSessionTimeline(timelineId, timelineParams);
    }

    case 'brainfish_generate_session_insights': {
      const { id: insightId, ...insightParams } = args;
      return await client.generateSessionInsights(insightId, insightParams);
    }

    case 'brainfish_get_analytics_threads':
      return await client.getAnalyticsThreads(args);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

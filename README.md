# Brainfish MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [Brainfish](https://brainfi.sh) — giving AI assistants in Cursor, Claude, VS Code, and other MCP-compatible tools direct access to your Brainfish knowledge base.

**Endpoint:** `https://mcp.brainfi.sh`

---

## Quick Start

### Claude.ai Web (OAuth 2.1 — recommended)

Go to **[claude.ai/settings/integrations](https://claude.ai/settings/integrations)** → **Add custom connector**:

1. **Name:** `Brainfish`
2. **URL:** `https://mcp.brainfi.sh`
3. Click **Add** → a browser window opens → enter your Brainfish API token → **Authorize**

Claude handles the full OAuth flow. No manual token pasting required.

---

### Cursor

Go to **Settings → Features → MCP Servers → Add new global MCP server**:

```json
{
  "mcpServers": {
    "brainfish": {
      "url": "https://mcp.brainfi.sh",
      "headers": {
        "Authorization": "Bearer bf_api_YOUR_TOKEN",
        "agent-key": "YOUR_AGENT_KEY"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "brainfish": {
      "url": "https://mcp.brainfi.sh",
      "headers": {
        "Authorization": "Bearer bf_api_YOUR_TOKEN",
        "agent-key": "YOUR_AGENT_KEY"
      }
    }
  }
}
```

### VS Code Copilot

Add to your User Settings (JSON):

```json
{
  "mcp": {
    "servers": {
      "brainfish": {
        "type": "http",
        "url": "https://mcp.brainfi.sh",
        "headers": {
          "Authorization": "Bearer bf_api_YOUR_TOKEN",
          "agent-key": "YOUR_AGENT_KEY"
        }
      }
    }
  }
}
```

---

## Getting Your Credentials

| Credential | Where to find it |
|---|---|
| `bf_api_YOUR_TOKEN` | [Brainfish Dashboard](https://app.brainfi.sh) → Settings → API Tokens |
| `YOUR_AGENT_KEY` | [Brainfish Dashboard](https://app.brainfi.sh) → Agents → click any agent to copy its key |

> **`agent-key` is only required** for AI answer tools (`brainfish_generate_answer`, `brainfish_generate_follow_ups`). All other tools work with the API token alone.

---

## Authentication

The server supports two authentication methods:

### OAuth 2.1 (Claude.ai web, automatic)

The server implements the full [MCP OAuth 2.1 spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization):

| Endpoint | URL |
|---|---|
| Discovery | `https://mcp.brainfi.sh/.well-known/oauth-authorization-server` |
| Authorization | `https://mcp.brainfi.sh/authorize` |
| Token | `https://mcp.brainfi.sh/token` |
| Registration | `https://mcp.brainfi.sh/register` |

When Claude.ai calls the MCP server without credentials it receives a `401` with a `WWW-Authenticate` header pointing to the discovery document. Claude then opens the `/authorize` page in a browser where you enter your Brainfish API token once. The server issues a Bearer token that Claude stores and re-uses.

**No database or server-side secrets are involved.** Credentials are encoded inside the tokens themselves (stateless, PKCE-verified).

### Bearer Token (Cursor, Claude Desktop, VS Code)

Pass your API token directly in the `Authorization` header:

```
Authorization: Bearer bf_api_YOUR_TOKEN
```

---

## Available Tools (26)

### Search & Documents

| Tool | Description |
|---|---|
| `brainfish_search_documents` | Semantic search across your knowledge base |
| `brainfish_get_document` | Get full document content by ID or URL slug |
| `brainfish_list_documents` | List documents with filtering and pagination |
| `brainfish_create_document` | Create a new document in a collection |
| `brainfish_update_document` | Update title, content, or publish status |
| `brainfish_delete_document` | Soft-delete (or permanently delete) a document |

### Suggestions

| Tool | Description |
|---|---|
| `brainfish_suggest_document_changes` | Propose edits to an existing document (goes through review) |
| `brainfish_suggest_new_document` | Suggest a new document for creation |
| `brainfish_update_suggestion` | Update a pending suggestion before review |
| `brainfish_generate_article_suggestion` | Trigger AI-powered article suggestions from content (async) |

### Collections

| Tool | Description |
|---|---|
| `brainfish_list_collections` | List all accessible collections |
| `brainfish_get_collection` | Get collection details by ID |
| `brainfish_create_collection` | Create a new collection |
| `brainfish_update_collection` | Update collection name, description, visibility |
| `brainfish_delete_collection` | Delete a collection and all its documents |

### AI & Answers

| Tool | Description |
|---|---|
| `brainfish_generate_answer` | Generate an AI answer from your knowledge base (requires agent-key) |
| `brainfish_generate_follow_ups` | Generate follow-up questions for a conversation (requires agent-key) |

### Catalogs

| Tool | Description |
|---|---|
| `brainfish_list_catalogs` | List all catalogs with optional filtering |
| `brainfish_get_catalog` | Get catalog details and content count |
| `brainfish_create_catalog` | Create a new catalog |
| `brainfish_sync_catalog_content` | Full sync of content files to a catalog |

### Sessions & Analytics

| Tool | Description |
|---|---|
| `brainfish_search_sessions` | Search chat sessions by query text and filters |
| `brainfish_get_session` | Get full conversation detail (queries, answers, feedback, analytics) |
| `brainfish_get_session_timeline` | Get chronological event timeline for a conversation |
| `brainfish_generate_session_insights` | Generate structured LLM diagnosis of a session |

### Auth

| Tool | Description |
|---|---|
| `brainfish_validate_token` | Validate your API token and return user/team info |

---

## MCP Resources (5)

Resources provide read-only, referenceable content via `brainfish://` URIs:

| URI | Description |
|---|---|
| `brainfish://collections` | All accessible collections |
| `brainfish://collection/{id}` | Collection details and metadata |
| `brainfish://collection/{id}/documents` | Documents within a collection |
| `brainfish://document/{id}` | Full document content in Markdown |
| `brainfish://search?query={q}` | Semantic search results |

---

## Example Prompts

```
"Use Brainfish to answer: how do I reset my password?"
```
```
"Search Brainfish for our API authentication guide and update it with the new OAuth steps"
```
```
"Create a new document in the Help Center collection about webhook setup"
```
```
"List all collections in my Brainfish workspace"
```
```
"Find recent sessions where users asked about refunds and tell me what went wrong"
```
```
"Show me the full conversation for session abc123 and generate insights on why it failed"
```

---

## Error Handling

| HTTP Code | Error | Meaning |
|---|---|---|
| 401 | `authentication_required` | Missing or invalid API token |
| 403 | `forbidden` | Token lacks permission for this resource |
| 404 | `not_found` | Resource does not exist |
| 409 | `conflict` | Duplicate request (article suggestions cached for 5 min) |
| 422 | `validation_failed` | Invalid request parameters |
| 429 | `rate_limit_exceeded` | 25 req/min limit reached |
| 500 | `internal_error` | Brainfish server error |

Responses include a `requestId` you can share with Brainfish support for debugging.

---

## Self-Hosting

The server is a Next.js app deployable to Vercel with zero configuration:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrainfish-ai%2Fbrainfish-mcp-server)

No environment variables required — credentials are passed per-request.

---

## Support

- Help Center: [help.brainfi.sh](https://help.brainfi.sh)
- API Reference: [help.brainfi.sh/articles/api-reference-7mjzVCAmeM](https://help.brainfi.sh/articles/api-reference-7mjzVCAmeM)
- Issues: [github.com/brainfish-ai/brainfish-mcp-server/issues](https://github.com/brainfish-ai/brainfish-mcp-server/issues)

---

## License

MIT — see [LICENSE](LICENSE)

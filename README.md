# Brainfish MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [Brainfish](https://brainfi.sh) — giving AI assistants in Cursor, Claude Desktop, VS Code, and other MCP-compatible tools direct access to your Brainfish knowledge base.

**Endpoint:** `https://mcp.brainfi.sh/api/mcp`

---

## Quick Start

No installation required. Add the following to your MCP client configuration and you're ready to go.

### Cursor

Go to **Settings → Features → MCP Servers → Add new global MCP server**:

```json
{
  "mcpServers": {
    "brainfish": {
      "url": "https://mcp.brainfi.sh/api/mcp",
      "headers": {
        "Authorization": "Bearer bf_api_YOUR_TOKEN",
        "agent-key": "your-agent-key"
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
      "url": "https://mcp.brainfi.sh/api/mcp",
      "headers": {
        "Authorization": "Bearer bf_api_YOUR_TOKEN",
        "agent-key": "your-agent-key"
      }
    }
  }
}
```

### VS Code

Add to your User Settings (JSON):

```json
{
  "mcp": {
    "servers": {
      "brainfish": {
        "type": "http",
        "url": "https://mcp.brainfi.sh/api/mcp",
        "headers": {
          "Authorization": "Bearer bf_api_YOUR_TOKEN",
          "agent-key": "your-agent-key"
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
| `Authorization` | [Brainfish Dashboard](https://app.brainfi.sh) → Settings → API Tokens → create a token starting with `bf_api_` |
| `agent-key` | [Brainfish Dashboard](https://app.brainfi.sh) → Agents → click any agent to copy its key |

The `agent-key` is only required for AI answer generation tools (`brainfish_generate_answer`, `brainfish_generate_follow_ups`). All other tools work with the API token alone.

---

## Available Tools (22)

### Authentication
| Tool | Description |
|---|---|
| `brainfish_validate_token` | Validate your API token and return user/team info |

### Documents
| Tool | Description |
|---|---|
| `brainfish_search_documents` | Semantic search across your knowledge base |
| `brainfish_list_documents` | List documents with filtering and pagination |
| `brainfish_get_document` | Get full document content by ID or URL slug |
| `brainfish_create_document` | Create a new document in a collection |
| `brainfish_update_document` | Update title, content, or publish status |
| `brainfish_delete_document` | Soft-delete (or permanently delete) a document |
| `brainfish_generate_article_suggestion` | Trigger AI-powered article suggestions from content (async) |

### Collections
| Tool | Description |
|---|---|
| `brainfish_list_collections` | List all accessible collections |
| `brainfish_get_collection` | Get collection details by ID |
| `brainfish_create_collection` | Create a new collection |
| `brainfish_update_collection` | Update collection name, description, visibility |
| `brainfish_delete_collection` | Delete a collection and all its documents |

### AI Agents
| Tool | Description |
|---|---|
| `brainfish_generate_answer` | Generate an AI answer from your knowledge base (requires agent-key) |
| `brainfish_generate_follow_ups` | Generate follow-up questions for a completed conversation (requires agent-key) |

### Catalogs
| Tool | Description |
|---|---|
| `brainfish_list_catalogs` | List all catalogs, with optional source/status filtering |
| `brainfish_create_catalog` | Create a new catalog |
| `brainfish_get_catalog` | Get catalog details and content count |
| `brainfish_sync_catalog_content` | Full sync of content files to a catalog |

### Document Suggestions (internal workflow)
| Tool | Description |
|---|---|
| `brainfish_suggest_document_changes` | Propose edits to an existing document (goes through review) |
| `brainfish_suggest_new_document` | Suggest a new document for creation |
| `brainfish_update_suggestion` | Update a pending suggestion before review |

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

## Example Usage

### Answer a question from your knowledge base
```
"Use Brainfish to answer: how do I reset my password?"
```

### Find and update a document
```
"Search Brainfish for our API authentication guide and update it with the new OAuth steps"
```

### Create new content
```
"Create a new document in the Help Center collection about webhook setup"
```

### Sync external content to a catalog
```json
{
  "name": "brainfish_sync_catalog_content",
  "arguments": {
    "id": "your-catalog-uuid",
    "files": [
      {
        "url": "https://docs.yoursite.com/getting-started",
        "title": "Getting Started",
        "content": "# Getting Started\n\nWelcome..."
      }
    ]
  }
}
```

---

## Error Handling

| HTTP Code | Error | Meaning |
|---|---|---|
| 401 | `authentication_required` | Missing or invalid API token / agent key |
| 404 | `not_found` | Resource does not exist |
| 409 | `conflict` | Duplicate request (article suggestions cached for 5 min) |
| 422 | `validation_failed` | Invalid request parameters |
| 429 | `rate_limit_exceeded` | 25 req/min limit reached |
| 500 | `internal_error` | Brainfish server error |

Responses include a `requestId` you can share with Brainfish support for debugging.

---

## Self-Hosting

The server is a Next.js app. Deploy your own instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrainfish-ai%2Fbrainfish-mcp-server)

Credentials are passed per-request via HTTP headers — no environment variables required on the server.

---

## Support

- Help Center: [help.brainfi.sh](https://help.brainfi.sh)
- API Reference: [help.brainfi.sh/articles/api-reference-7mjzVCAmeM](https://help.brainfi.sh/articles/api-reference-7mjzVCAmeM)
- Issues: [github.com/brainfish-ai/brainfish-mcp-server/issues](https://github.com/brainfish-ai/brainfish-mcp-server/issues)

---

## License

MIT — see [LICENSE](LICENSE)

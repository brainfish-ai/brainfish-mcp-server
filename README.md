# Brainfish MCP Server

A Model Context Protocol (MCP) server implementation that integrates with [Brainfish](https://brainfi.sh) for knowledge base management and AI-powered content operations.

## Features

- **Document Management**: Search, create, update, and delete documents in your Brainfish knowledge base
- **Semantic Search**: Find relevant content using AI-powered semantic search
- **Document Suggestions**: Propose and manage content improvements through a collaborative workflow
- **Collection Management**: Organize documents into collections with proper permissions
- **AI-Powered Answers**: Generate streaming AI responses from your knowledge base
- **Authentication**: Secure API token and agent key management

## Installation

### Quick Deploy (No Environment Variables Required!)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrainfish-ai%2Fbrainfish-mcp-server)

**That's it!** Users pass their credentials through MCP client configuration.

### Running Locally

```bash
npx -y brainfish-mcp
# Credentials passed via MCP client headers
```

### Manual Installation

```bash
npm install -g brainfish-mcp
```

### Running on Cursor

To configure Brainfish MCP in Cursor:

1. Open Cursor Settings
2. Go to Features > MCP Servers
3. Click "+ Add new global MCP server"
4. Enter the following configuration:

```json
{
  "mcpServers": {
    "brainfish-mcp": {
      "url": "https://your-project.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer bf_api_YOUR_TOKEN",
        "agent-key": "your-agent-key"
      }
    }
  }
}
```

### Running on VS Code

Add the following to your User Settings (JSON) file:

```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "apiToken",
        "description": "Brainfish API Token",
        "password": true
      },
      {
        "type": "promptString", 
        "id": "agentKey",
        "description": "Brainfish Agent Key",
        "password": true
      }
    ],
    "servers": {
      "brainfish": {
        "command": "npx",
        "args": ["-y", "brainfish-mcp"],
        "env": {
          "BRAINFISH_API_TOKEN": "${input:apiToken}",
          "BRAINFISH_AGENT_KEY": "${input:agentKey}"
        }
      }
    }
  }
}
```

## Configuration

### Environment Variables

#### Required

- `BRAINFISH_API_TOKEN`: Your Brainfish API token (starts with `bf_api_`)
  - Get this from your [Brainfish Dashboard](https://app.brainfi.sh) under **Settings → API Tokens**

#### Optional (for AI features)

- `BRAINFISH_AGENT_KEY`: Your agent key for AI-powered features
  - Get this from your Brainfish Dashboard under **Agents**
  - Required for `brainfish_generate_answer` tool

#### Optional Configuration

- `BRAINFISH_API_URL`: Custom API endpoint (default: `https://api.brainfi.sh`)
- `BRAINFISH_TIMEOUT`: Request timeout in milliseconds (default: 30000)
- `BRAINFISH_RETRY_ATTEMPTS`: Maximum retry attempts (default: 3)
- `BRAINFISH_RETRY_DELAY`: Initial retry delay in milliseconds (default: 1000)

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "brainfish-mcp": {
      "command": "npx",
      "args": ["-y", "brainfish-mcp"],
      "env": {
        "BRAINFISH_API_TOKEN": "bf_api_YOUR_TOKEN",
        "BRAINFISH_AGENT_KEY": "your-agent-key"
      }
    }
  }
}
```

## Available Tools

### Document Management (Read-Only)

#### `brainfish_search_documents`
Search documents using semantic search.

```json
{
  "name": "brainfish_search_documents",
  "arguments": {
    "query": "How to reset user passwords",
    "collectionId": "col-123",
    "limit": 10,
    "cmsOnly": true
  }
}
```

#### `brainfish_get_document`
Retrieve a specific document by ID or URL slug.

#### `brainfish_list_documents`
List documents with filtering and pagination (read-only for content discovery).

### Collection Management (Read-Only)

#### `brainfish_list_collections`
List all available collections for content organization understanding.

### Document Suggestions (Review-Based Content Management)

#### `brainfish_suggest_document_changes`
Propose improvements to existing documents (goes through review process).

```json
{
  "name": "brainfish_suggest_document_changes",
  "arguments": {
    "documentId": "doc-123",
    "title": "Updated API Guide",
    "text": "# API Authentication (Updated)\n\nImproved with OAuth 2.0...",
    "reason": "Added OAuth 2.0 support and updated security requirements"
  }
}
```

#### `brainfish_suggest_new_document`
Suggest creating entirely new documents (requires base document for suggestion system).

```json
{
  "name": "brainfish_suggest_new_document",
  "arguments": {
    "baseDocumentId": "doc-123",
    "title": "Troubleshooting Guide",
    "text": "# Common Issues\n\n1. Connection problems...",
    "reason": "Users frequently ask about troubleshooting",
    "collectionId": "col-456"
  }
}
```

#### `brainfish_update_suggestion`
Update pending suggestions before they're reviewed.

### AI-Powered Features

#### `brainfish_generate_answer`
Generate AI answers from your knowledge base (requires agent key).

```json
{
  "name": "brainfish_generate_answer",
  "arguments": {
    "query": "How do I integrate the API?",
    "conversationId": "01234567890123456789012345"
  }
}
```

### Authentication

#### `brainfish_validate_token`
Validate your API token and get user information.

#### `brainfish_revoke_token`
Revoke the current API token.

## Common Workflows

### Content Suggestion Workflow

```javascript
// 1. List collections to understand organization
await mcp.call('brainfish_list_collections');

// 2. Search for existing content to improve
const results = await mcp.call('brainfish_search_documents', {
  query: "API authentication"
});

// 3. Get full document content
const document = await mcp.call('brainfish_get_document', {
  id: results.data[0].id
});

// 4. Suggest improvements (goes through review)
await mcp.call('brainfish_suggest_document_changes', {
  documentId: results.data[0].id,
  title: "Enhanced API Authentication Guide",
  text: "# API Authentication (Enhanced)\n\nUpdated with OAuth 2.0...",
  reason: "Added OAuth 2.0 support and security best practices"
});
```

### New Document Suggestion Workflow

```javascript
// 1. Find a base document in the target collection
const documents = await mcp.call('brainfish_list_documents', {
  collectionId: "col-help-center"
});

// 2. Suggest new document creation
await mcp.call('brainfish_suggest_new_document', {
  baseDocumentId: documents.data[0].id,
  title: "Advanced Troubleshooting Guide",
  text: "# Advanced Troubleshooting\n\n## Common Issues\n1. Connection timeouts...",
  reason: "Users frequently need advanced troubleshooting help",
  collectionId: "col-help-center"
});
```

### AI-Powered Q&A

```javascript
// Generate AI answer from knowledge base
const answer = await mcp.call('brainfish_generate_answer', {
  query: "How do I troubleshoot API connection issues?",
  conversationId: "conversation-123"
});

// Follow-up question in same conversation
const followup = await mcp.call('brainfish_generate_answer', {
  query: "What about rate limiting errors?",
  conversationId: "conversation-123"
});
```

## Error Handling

The server provides comprehensive error handling with detailed error messages:

```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "statusCode": 422,
  "validationErrors": [
    {
      "field": "query",
      "message": "Query cannot be empty",
      "code": "invalid_string"
    }
  ],
  "requestId": "req-abc123"
}
```

Common error codes:
- `authentication_required` (401): Invalid or missing API token/agent key
- `not_found` (404): Resource not found
- `validation_failed` (422): Invalid request parameters
- `rate_limit_exceeded` (429): Too many requests
- `internal_error` (500): Server error

## Rate Limiting

The API implements rate limiting:
- Most endpoints: 25 requests per minute
- Token revocation: 10 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

## Getting Started

1. **Get your API credentials**:
   - Create an account at [Brainfish](https://app.brainfi.sh)
   - Generate an API token under **Settings → API Tokens**
   - (Optional) Get an agent key under **Agents** for AI features

2. **Install and configure**:
   ```bash
   npm install -g brainfish-mcp
   ```

3. **Test your setup**:
   ```bash
   env BRAINFISH_API_TOKEN=bf_api_YOUR_TOKEN npx brainfish-mcp
   ```

4. **Validate your token**:
   ```json
   {
     "name": "brainfish_validate_token",
     "arguments": {}
   }
   ```

## Support

- Documentation: [Brainfish Help Center](https://help.brainfi.sh)
- API Reference: [Brainfish API Docs](https://help.brainfi.sh/articles/api-reference-7mjzVCAmeM)
- Issues: [GitHub Issues](https://github.com/brainfish-ai/brainfish-mcp-server/issues)

## License

MIT License - see LICENSE file for details.
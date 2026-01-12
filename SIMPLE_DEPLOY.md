# Simple Deployment - No Environment Variables Required!

## 🎉 Zero-Config Deployment

Deploy the Brainfish MCP server without any environment variables. Users pass their credentials directly through their MCP client configuration.

## 🚀 One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrainfish-ai%2Fbrainfish-mcp-server)

**That's it!** No environment variables needed during deployment.

## 📱 User Configuration

Users configure their credentials in their MCP client (Cursor, Claude Desktop, etc.):

### Cursor Configuration
Users create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "brainfish": {
      "url": "https://your-project.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer bf_api_their_token_here",
        "agent-key": "their_agent_key_here"
      }
    }
  }
}
```

### Claude Desktop Configuration
Users add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "brainfish": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {
        "FETCH_URL": "https://your-project.vercel.app/api/mcp",
        "FETCH_HEADERS": "{\"Authorization\": \"Bearer bf_api_their_token\", \"agent-key\": \"their_agent_key\"}"
      }
    }
  }
}
```

## 🔑 How It Works

### 1. Deploy Once, Use Many Times
- **Deploy**: One deployment serves all users
- **Configure**: Each user adds their own credentials to their MCP client
- **Secure**: Credentials never stored on the server

### 2. Multiple Authentication Methods
Our server accepts credentials via multiple header formats:

```typescript
// Standard OAuth Bearer token
Authorization: Bearer bf_api_token

// Custom API key headers
x-brainfish-api-key: bf_api_token
x-api-key: bf_api_token

// Agent key for AI features
agent-key: agent_key_value
```

### 3. Per-Request Authentication
- Each MCP request includes user credentials in headers
- Server validates credentials with Brainfish API on each request
- No server-side credential storage required

## 🎯 Benefits

### For Deployment
- ✅ **No environment variables** required during deployment
- ✅ **One deployment** serves unlimited users
- ✅ **Zero configuration** needed on server side
- ✅ **Instant deployment** - just click and deploy

### For Users
- ✅ **Own their credentials** - never shared with server
- ✅ **Easy setup** - just add to MCP client config
- ✅ **Secure** - credentials sent directly to Brainfish API
- ✅ **Flexible** - can use different tokens for different projects

### For Security
- ✅ **No credential storage** on server
- ✅ **Direct API communication** - server acts as proxy
- ✅ **Per-request validation** with Brainfish
- ✅ **User controls access** - can revoke tokens anytime

## 📋 User Instructions

### Step 1: Get Brainfish Credentials
1. Go to [Brainfish Dashboard](https://app.brainfi.sh)
2. **API Token**: Settings → API Tokens → Create New Token
3. **Agent Key**: Agents → Copy agent key (optional, for AI features)

### Step 2: Use Any Deployed Server
Users can use any deployed Brainfish MCP server:
- `https://brainfish-mcp.vercel.app/api/mcp` (official)
- `https://your-custom-deployment.vercel.app/api/mcp` (custom)

### Step 3: Configure MCP Client
Add credentials to their MCP client configuration (see examples above).

### Step 4: Test
```bash
# Test with any MCP client
"List my Brainfish collections"
"Search for documents about API authentication"
"Generate an answer from my knowledge base"
```

## 🔄 Migration from Environment Variables

If you previously deployed with environment variables, you can:

1. **Keep existing deployment** - environment variables still work as fallback
2. **Deploy new version** - users can now pass credentials via headers
3. **Remove environment variables** - once all users migrate to header-based auth

## 🌟 Example: Public MCP Server

You could even run a public MCP server that anyone can use:

```markdown
# Public Brainfish MCP Server
**URL**: https://brainfish-mcp-public.vercel.app/api/mcp

## Usage
Add to your MCP client with your own Brainfish credentials:

```json
{
  "mcpServers": {
    "brainfish": {
      "url": "https://brainfish-mcp-public.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_BRAINFISH_TOKEN",
        "agent-key": "YOUR_AGENT_KEY"
      }
    }
  }
}
```

**Security**: Your credentials are sent directly to Brainfish API. The MCP server never stores or logs your credentials.
```

This approach is much more user-friendly and follows the principle of least privilege! 🎉
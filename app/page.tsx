export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 Brainfish MCP Server
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Model Context Protocol server for Brainfish knowledge base management
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">
              MCP Endpoint
            </h2>
            <code className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm font-mono">
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/mcp
            </code>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🔍 Document Search</h3>
              <p className="text-sm text-gray-600">
                Semantic search across your knowledge base with AI-powered relevance scoring
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📝 Content Management</h3>
              <p className="text-sm text-gray-600">
                Create, update, and organize documents in collections
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">💡 Smart Suggestions</h3>
              <p className="text-sm text-gray-600">
                Collaborative content improvement through suggestion workflows
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Answers</h3>
              <p className="text-sm text-gray-600">
                Generate streaming AI responses from your knowledge base
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">
              Configure this MCP server in your AI client with your Brainfish credentials:
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-left overflow-x-auto">
              <pre className="text-xs font-mono">
{`{
  "mcpServers": {
    "brainfish": {
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/mcp",
      "headers": {
        "Authorization": "Bearer bf_api_YOUR_TOKEN",
        "agent-key": "YOUR_AGENT_KEY"
      }
    }
  }
}`}
              </pre>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>🔒 Secure:</strong> Your credentials are sent directly to Brainfish API. 
                This server never stores your tokens.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center space-x-4">
            <a
              href="https://github.com/brainfish-ai/brainfish-mcp-server"
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              📚 Documentation
            </a>
            <a
              href="https://app.brainfi.sh"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              🚀 Get API Token
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
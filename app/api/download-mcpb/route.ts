import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

// Generates a Claude Desktop Extension (.mcpb) file on-the-fly with the user's token
// embedded. The extension uses `npx mcp-remote` (which Claude Desktop's bundled Node.js
// can run) to bridge its stdio transport to our remote HTTP MCP server.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token || !token.startsWith('bf_api_')) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const manifest = {
    mcpb_version: '0.1',
    name: 'brainfish',
    display_name: 'Brainfish',
    version: '1.0.0',
    description: 'Brainfish knowledge base — search articles, manage docs, and more.',
    author: {
      name: 'Brainfish',
      url: 'https://brainfi.sh',
    },
    homepage: 'https://brainfi.sh',
    server: {
      type: 'node',
      mcp_config: {
        command: 'npx',
        args: [
          '-y',
          'mcp-remote',
          'https://mcp.brainfi.sh',
          '--header',
          `Authorization: Bearer ${token}`,
        ],
      },
    },
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="brainfish.mcpb"',
      'Content-Length': String(buffer.length),
      // Prevent caching — each download has a unique token
      'Cache-Control': 'no-store',
    },
  });
}

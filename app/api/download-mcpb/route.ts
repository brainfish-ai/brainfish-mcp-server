import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

// server/index.js bundled inside the .mcpb — spawns `npx mcp-remote` with the token
// passed via env var so Claude Desktop's built-in Node.js can run it without any setup.
const SERVER_JS = `\
const { spawn } = require('child_process');
const token = process.env.BRAINFISH_API_TOKEN || '';
const child = spawn('npx', [
  '-y', 'mcp-remote', 'https://mcp.brainfi.sh',
  '--header', 'Authorization: Bearer ' + token,
], { stdio: 'inherit' });
child.on('exit', function(code) { process.exit(code || 0); });
`;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token || !token.startsWith('bf_api_')) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const manifest = {
    manifest_version: '0.3',
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
      entry_point: 'server/index.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/index.js'],
        env: {
          BRAINFISH_API_TOKEN: token,
        },
      },
    },
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('server/index.js', SERVER_JS);

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Buffer is not in TS's BodyInit; use a standalone ArrayBuffer (slice narrows off pool slack).
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="brainfish.mcpb"',
      'Content-Length': String(arrayBuffer.byteLength),
      'Cache-Control': 'no-store',
    },
  });
}

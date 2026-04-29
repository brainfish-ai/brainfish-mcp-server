import { cookies } from 'next/headers';
import { TOOLS } from '../api/mcp/lib/tools';
import { McpLandingClient } from './McpLandingClient';

export default async function McpLandingPage() {
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get('accessToken')?.value;
  const appUrl = process.env.BRAINFISH_APP_URL ?? 'https://app.brainfi.sh';
  const toolCount = Object.keys(TOOLS).length;

  return (
    <McpLandingClient
      hasSession={hasSession}
      appUrl={appUrl}
      toolCount={toolCount}
    />
  );
}

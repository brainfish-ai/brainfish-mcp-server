import { cookies } from 'next/headers';
import { TOOLS } from '../api/mcp/lib/tools';
import { McpLandingClient } from './McpLandingClient';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

export default async function McpLandingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const handoffCode = firstString(sp.mcp_code);

  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get('accessToken')?.value;
  const appUrl = process.env.BRAINFISH_APP_URL ?? 'https://app.brainfi.sh';
  const toolCount = Object.keys(TOOLS).length;

  return (
    <McpLandingClient
      hasSession={hasSession}
      appUrl={appUrl}
      toolCount={toolCount}
      handoffCode={handoffCode}
    />
  );
}

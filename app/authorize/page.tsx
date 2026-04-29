import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@brainfish-ai/components/logo';
import { AuthorizeClient } from './AuthorizeClient';
import styles from './authorize.module.css';
import { verifyMcpCode } from './verify-mcp-code';

export const metadata: Metadata = {
  title: 'Connect to Brainfish — Brainfish',
};

export const dynamic = 'force-dynamic';

const BRAINFISH_APP_URL = process.env.BRAINFISH_APP_URL || 'https://app.brainfi.sh';

function ErrorGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AuthorizeError({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.errorCard}>
        <div className={styles.logoWrap}>
          <Logo variant="full" />
        </div>
        <div className={styles.errorIcon}>
          <ErrorGlyph />
        </div>
        <h1 className={styles.errorTitle}>Authorization Error</h1>
        <div className={styles.errorBody}>{children}</div>
      </div>
    </div>
  );
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

export default async function AuthorizePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const redirectUri = firstString(sp.redirect_uri);
  const state = firstString(sp.state);
  const codeChallenge = firstString(sp.code_challenge);
  const clientId = firstString(sp.client_id);
  const clientNameParam = firstString(sp.client_name);
  const clientName =
    clientNameParam || (clientId ? clientId : '') || 'an AI assistant';
  const mcpCode = firstString(sp.mcp_code);

  if (!redirectUri || !codeChallenge) {
    return (
      <AuthorizeError>
        This page must be opened by an MCP client. The <code>redirect_uri</code> and{' '}
        <code>code_challenge</code> parameters are required.
      </AuthorizeError>
    );
  }

  if (
    !redirectUri.startsWith('https://') &&
    !redirectUri.startsWith('http://localhost') &&
    !redirectUri.startsWith('http://127.0.0.1')
  ) {
    return (
      <AuthorizeError>
        The <code>redirect_uri</code> must use HTTPS or point to localhost.
      </AuthorizeError>
    );
  }

  if (mcpCode) {
    const secret = process.env.MCP_EXCHANGE_SECRET ?? '';
    if (!secret) {
      return (
        <AuthorizeError>MCP_EXCHANGE_SECRET is not configured on this server.</AuthorizeError>
      );
    }
    let apiToken: string;
    try {
      const payload = await verifyMcpCode(mcpCode, secret);
      apiToken = payload.apiToken;
    } catch {
      return (
        <AuthorizeError>
          The authorization code is invalid or expired. Please try again.
        </AuthorizeError>
      );
    }

    const codePayload = JSON.stringify({
      token: apiToken,
      challenge: codeChallenge,
      exp: Date.now() + 5 * 60 * 1000,
    });
    const code = Buffer.from(codePayload).toString('base64url');
    const callback = new URL(redirectUri);
    callback.searchParams.set('code', code);
    if (state) callback.searchParams.set('state', state);
    redirect(callback.toString());
  }

  return (
    <AuthorizeClient
      clientName={clientName}
      redirectUri={redirectUri}
      state={state}
      codeChallenge={codeChallenge}
      appUrl={BRAINFISH_APP_URL}
    />
  );
}

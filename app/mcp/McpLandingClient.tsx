'use client';

import { useEffect, useState } from 'react';
import { MCP_TOOL_GROUPS, toolLabel } from './tool-groups';
import { SetupMcpModal } from './SetupMcpModal';
import { Logo } from '@brainfish-ai/components/logo';
import { Button } from '@brainfish-ai/components/ui/button';

const MCP_ENDPOINT = 'https://mcp.brainfi.sh';

type Props = {
  hasSession: boolean;
  appUrl: string;
  toolCount: number;
};

export function McpLandingClient({ hasSession, appUrl, toolCount }: Props) {
  const [setupTab, setSetupTab] = useState<'cursor' | 'claude'>('cursor');
  const [copyHint, setCopyHint] = useState('click to copy');

  useEffect(() => {
    (window as unknown as { __BF_SESSION?: boolean }).__BF_SESSION =
      hasSession;
  }, [hasSession]);

  function copyEndpoint() {
    void navigator.clipboard.writeText(MCP_ENDPOINT).then(() => {
      setCopyHint('Copied!');
      setTimeout(() => setCopyHint('click to copy'), 1500);
    });
  }

  function copyClaudeUrlTemplate() {
    void navigator.clipboard
      .writeText(`${MCP_ENDPOINT}?token=bf_api_YOUR_TOKEN`)
      .then(() => {
        const el = document.querySelector('.claude-url-copy');
        if (el) el.textContent = 'Copied!';
        setTimeout(() => {
          if (el) el.textContent = 'copy';
        }, 1500);
      });
  }

  function copyMonacoSnippet() {
    const pre = document.querySelector('.monaco-editor pre');
    const text = pre?.textContent || '';
    void navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('.monaco-copy-btn');
      if (btn) btn.textContent = 'Copied!';
      setTimeout(() => {
        if (btn) btn.textContent = 'Copy';
      }, 1500);
    });
  }

  return (
    <div className="bfMcpLanding">
      <nav>
        <a
          className="logo"
          href="https://brainfi.sh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Logo variant="full" />
        </a>
        <span className="nav-badge">MCP Server · Live</span>
      </nav>

      <section className="hero">
        <div className="hero-eyebrow">Model Context Protocol</div>
        <h1>
          Your knowledge base,
          <br />
          <span>inside your AI tools</span>
        </h1>
        <p className="hero-sub">
          Connect Cursor, Claude Desktop, and VS Code Copilot directly to your
          Brainfish knowledge base — search, create, and manage content without
          leaving your editor.
        </p>
        <div
          className="endpoint-pill"
          onClick={copyEndpoint}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') copyEndpoint();
          }}
          role="button"
          tabIndex={0}
        >
          <span className="dot" />
          {MCP_ENDPOINT}
          <span className="copy-hint">{copyHint}</span>
        </div>
        <div className="hero-actions">
          <SetupMcpModal appUrl={appUrl} />
          <Button size="lg" elevation="shadow" variant="outline" asChild>
            <a
              className="btn btn-secondary"
              href="https://github.com/brainfish-ai/brainfish-mcp-server"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
              </svg>
              View on GitHub
            </a>
          </Button>
        </div>
      </section>

      <main>
        <div className="section">
          <div className="section-label">Quick setup</div>

          <div className="setup-tabs">
            <button
              type="button"
              className={`setup-tab${setupTab === 'cursor' ? ' active' : ''}`}
              onClick={() => setSetupTab('cursor')}
            >
              Cursor / Claude Desktop
            </button>
            <button
              type="button"
              className={`setup-tab${setupTab === 'claude' ? ' active' : ''}`}
              onClick={() => setSetupTab('claude')}
            >
              Claude.ai Web
            </button>
          </div>

          <div
            id="setup-cursor"
            className={`setup-panel${setupTab === 'cursor' ? ' active' : ''}`}
          >
            <div className="monaco-editor">
              <div className="monaco-titlebar">
                <div className="monaco-dots">
                  <span className="monaco-dot red" />
                  <span className="monaco-dot yellow" />
                  <span className="monaco-dot green" />
                </div>
              </div>
              <div className="monaco-tabs">
                <div className="monaco-tab">
                  <span className="monaco-tab-icon">■</span>
                  mcp.json
                </div>
              </div>
              <div className="monaco-body">
                <div className="monaco-gutter">
                  {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className={i === 0 ? 'active' : undefined}>
                      {i + 1}
                    </span>
                  ))}
                </div>
                <div className="monaco-code">
                  <pre>
                    <span className="tok-brace">{'{'}</span>
                    {'\n'}
                    {'  '}
                    <span className="tok-key">&quot;mcpServers&quot;</span>
                    <span className="tok-brace">: {'{'}</span>
                    {'\n'}
                    {'    '}
                    <span className="tok-key">&quot;brainfish&quot;</span>
                    <span className="tok-brace">: {'{'}</span>
                    {'\n'}
                    {'      '}
                    <span className="tok-key">&quot;url&quot;</span>
                    <span className="tok-brace">: </span>
                    <span className="tok-str">
                      &quot;https://mcp.brainfi.sh&quot;
                    </span>
                    <span className="tok-brace">,</span>
                    {'\n'}
                    {'      '}
                    <span className="tok-key">&quot;headers&quot;</span>
                    <span className="tok-brace">: {'{'}</span>
                    {'\n'}
                    {'        '}
                    <span className="tok-key">&quot;Authorization&quot;</span>
                    <span className="tok-brace">: </span>
                    <span className="tok-str">
                      &quot;Bearer bf_api_YOUR_TOKEN&quot;
                    </span>
                    <span className="tok-brace">,</span>
                    {'\n'}
                    {'        '}
                    <span className="tok-key">&quot;agent-key&quot;</span>
                    <span className="tok-brace">: </span>
                    <span className="tok-str">&quot;YOUR_AGENT_KEY&quot;</span>
                    {'  '}
                    <span className="tok-comment">// optional</span>
                    {'\n'}
                    {'      '}
                    <span className="tok-brace">{'}'}</span>
                    {'\n'}
                    {'    '}
                    <span className="tok-brace">{'}'}</span>
                    {'\n'}
                    {'  '}
                    <span className="tok-brace">{'}'}</span>
                    {'\n'}
                    <span className="tok-brace">{'}'}</span>
                  </pre>
                </div>
              </div>
              <div className="monaco-statusbar">
                <div className="monaco-statusbar-left">
                  <span>✓ mcp.json</span>
                  <span>JSON</span>
                </div>
                <div className="monaco-statusbar-right">
                  <span>Ln 1, Col 1</span>
                  <button
                    type="button"
                    className="monaco-copy-btn"
                    onClick={copyMonacoSnippet}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            id="setup-claude"
            className={`setup-panel${setupTab === 'claude' ? ' active' : ''}`}
          >
            <div className="claude-setup">
              <div className="claude-steps">
                <div className="claude-step">
                  <span className="step-num">1</span>
                  <div className="step-body">
                    <div className="step-title">
                      Open Claude.ai → Settings → Integrations
                    </div>
                    <div className="step-desc">
                      Go to{' '}
                      <a
                        href="https://claude.ai/settings/integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        claude.ai/settings/integrations
                      </a>{' '}
                      and click <strong>Add custom connector</strong>.
                    </div>
                  </div>
                </div>
                <div className="claude-step">
                  <span className="step-num">2</span>
                  <div className="step-body">
                    <div className="step-title">
                      Enter a name and URL with your token
                    </div>
                    <div className="step-desc">
                      Claude.ai doesn&apos;t support custom headers, so pass
                      your API token directly in the URL:
                    </div>
                    <div
                      className="claude-url-block"
                      onClick={copyClaudeUrlTemplate}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          copyClaudeUrlTemplate();
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <code>
                        https://mcp.brainfi.sh?token=
                        <span className="url-token">bf_api_YOUR_TOKEN</span>
                      </code>
                      <span className="url-copy claude-url-copy">copy</span>
                    </div>
                    <div className="step-desc" style={{ marginTop: '.5rem' }}>
                      Optionally append{' '}
                      <code className="inline-code">
                        &amp;agent-key=YOUR_AGENT_KEY
                      </code>{' '}
                      if using AI Answers.
                    </div>
                  </div>
                </div>
                <div className="claude-step">
                  <span className="step-num">3</span>
                  <div className="step-body">
                    <div className="step-title">Click Add — that&apos;s it</div>
                    <div className="step-desc">
                      No OAuth required. Claude will immediately discover all{' '}
                      {toolCount} Brainfish tools.
                    </div>
                  </div>
                </div>
              </div>
              <div className="claude-note">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                Credentials are embedded in the URL on your device only. Use a
                token with the minimum permissions your workflow needs.
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-label">
            {toolCount} available tools across {MCP_TOOL_GROUPS.length}{' '}
            categories
          </div>
          <div className="tool-groups">
            {MCP_TOOL_GROUPS.map((group) => (
              <div key={group.name} className="tool-group">
                <div className="tool-group-header">
                  <span className="tool-group-icon">{group.icon}</span>
                  <span className="tool-group-name">{group.name}</span>
                  <span className="tool-group-count">{group.tools.length}</span>
                </div>
                <div className="tool-tags">
                  {group.tools.map((t) => (
                    <span key={t} className="tool-tag">
                      {toolLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="security-note">
          <div className="security-icon">🔒</div>
          <p>
            <strong>Your credentials stay private.</strong> Tokens are forwarded
            directly to the Brainfish API on each request. This server never
            stores, logs, or caches your API keys.
          </p>
        </div>
      </main>

      <footer>
        <p>
          Built by{' '}
          <a href="https://brainfi.sh" target="_blank" rel="noopener noreferrer">
            Brainfish
          </a>{' '}
          ·{' '}
          <a
            href="https://github.com/brainfish-ai/brainfish-mcp-server"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

function escHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type ModalStep = 'loading' | 'login' | 'waiting' | 'result';

type Props = {
  appUrl: string;
  open: boolean;
  onClose: () => void;
};

export function SetupMcpModal({ appUrl, open, onClose }: Props) {
  const [step, setStep] = useState<ModalStep>('loading');
  const [error, setError] = useState('');
  const loginPopupRef = useRef<Window | null>(null);
  const loginTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [claudeHintVisible, setClaudeHintVisible] = useState(false);
  const [copyBtnLabel, setCopyBtnLabel] = useState('Copy');
  const [logoutBusy, setLogoutBusy] = useState(false);

  const clearModalError = useCallback(() => setError(''), []);

  const showModalError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const stopLoginTimer = useCallback(() => {
    if (loginTimerRef.current) {
      clearInterval(loginTimerRef.current);
      loginTimerRef.current = null;
    }
  }, []);

  const closePopup = useCallback(() => {
    stopLoginTimer();
    if (loginPopupRef.current && !loginPopupRef.current.closed) {
      loginPopupRef.current.close();
    }
    loginPopupRef.current = null;
  }, [stopLoginTimer]);

  const callSetupToken = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const res = await fetch('/api/setup-token', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          if (data.unauthenticated) {
            setStep('login');
            showModalError(
              'Your session has expired. Please log in again and try.',
            );
          } else {
            setStep('login');
            showModalError(
              data.error || 'Something went wrong. Please try again.',
            );
          }
          return;
        }
        const token = (data.apiToken as string) || '';
        populateConfigUi(token);
        setStep('result');
      } catch {
        setStep('login');
        showModalError(
          'Network error. Please check your connection and try again.',
        );
      }
    },
    [showModalError],
  );

  function populateConfigUi(apiToken: string) {
    const pre = document.getElementById('modal-config-pre');
    if (!pre) return;
    const lines = [
      '{',
      '  <span class="tok-key">&quot;mcpServers&quot;</span><span class="tok-brace">: {</span>',
      '    <span class="tok-key">&quot;brainfish&quot;</span><span class="tok-brace">: {</span>',
      '      <span class="tok-key">&quot;url&quot;</span><span class="tok-brace">:</span> <span class="tok-str">&quot;https://mcp.brainfi.sh&quot;</span><span class="tok-brace">,</span>',
      '      <span class="tok-key">&quot;headers&quot;</span><span class="tok-brace">: {</span>',
      `        <span class="tok-key">&quot;Authorization&quot;</span><span class="tok-brace">:</span> <span class="tok-str">&quot;Bearer ${escHtml(apiToken)}&quot;</span>`,
      '      <span class="tok-brace">}</span>',
      '    <span class="tok-brace">}</span>',
      '  <span class="tok-brace">}</span>',
      '<span class="tok-brace">}</span>',
    ];
    pre.innerHTML = lines.join('\n');
    const plain = JSON.stringify(
      {
        mcpServers: {
          brainfish: {
            url: 'https://mcp.brainfi.sh',
            headers: { Authorization: `Bearer ${apiToken}` },
          },
        },
      },
      null,
      2,
    );
    pre.dataset.plain = plain;
    const cursorBtn = document.getElementById('modal-cursor-btn');
    if (cursorBtn) {
      cursorBtn.dataset.cursorConfig = JSON.stringify({
        url: 'https://mcp.brainfi.sh',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
    }
    const claudeBtn = document.getElementById('modal-claude-btn');
    if (claudeBtn) {
      claudeBtn.dataset.apiToken = apiToken;
    }
  }

  useEffect(() => {
    if (!open) return;
    clearModalError();
    setStep('loading');
    void callSetupToken({});
  }, [open, callSetupToken, clearModalError]);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'bf:auth-complete') return;
      stopLoginTimer();
      closePopup();
      setStep('loading');
      void callSetupToken({});
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [callSetupToken, closePopup, stopLoginTimer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function openLoginPopup(provider: 'google' | 'email') {
    clearModalError();
    const authUrl =
      provider === 'email'
        ? `${appUrl}/auth/email`
        : `${appUrl}/auth/google`;
    const w = 520;
    const h = 640;
    const left = Math.max(0, (screen.width - w) / 2);
    const top = Math.max(0, (screen.height - h) / 2);
    const win = window.open(
      authUrl,
      'brainfish-login',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`,
    );
    if (!win) {
      window.open(authUrl, '_blank');
      showModalError(
        'Popup blocked. Please allow popups and try again, or log in and try again.',
      );
      return;
    }
    loginPopupRef.current = win;
    setStep('waiting');
    stopLoginTimer();
    loginTimerRef.current = setInterval(() => {
      if (!loginPopupRef.current || loginPopupRef.current.closed) {
        stopLoginTimer();
        loginPopupRef.current = null;
        setStep('loading');
        void callSetupToken({});
      }
    }, 500);
  }

  function doneLogin() {
    stopLoginTimer();
    closePopup();
    setStep('loading');
    void callSetupToken({});
  }

  function cancelLoginPopup() {
    stopLoginTimer();
    closePopup();
    setStep('login');
    clearModalError();
  }

  async function logoutBF() {
    setLogoutBusy(true);
    await fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(
      () => null,
    );
    document.cookie = 'accessToken=; Max-Age=0; path=/';
    setLogoutBusy(false);
    onClose();
  }

  function installInCursor() {
    const btn = document.getElementById('modal-cursor-btn');
    const config = btn?.dataset.cursorConfig || '';
    const encoded = btoa(unescape(encodeURIComponent(config)));
    window.location.href = `cursor://anysphere.cursor-deeplink/mcp/install?name=brainfish&config=${encoded}`;
  }

  function addToClaude() {
    const btn = document.getElementById('modal-claude-btn');
    const token = btn?.dataset.apiToken || '';
    if (!token) return;
    const a = document.createElement('a');
    a.href = `/api/download-mcpb?token=${encodeURIComponent(token)}`;
    a.download = 'brainfish.mcpb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setClaudeHintVisible(true);
  }

  function copyFilledConfig() {
    const pre = document.getElementById('modal-config-pre');
    const text = pre?.dataset.plain || pre?.innerText || '';
    void navigator.clipboard.writeText(text).then(() => {
      setCopyBtnLabel('Copied!');
      setTimeout(() => setCopyBtnLabel('Copy'), 1800);
    });
  }

  if (!open) return null;

  return (
    <div
      id="setup-modal"
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-title" id="modal-title">
            Setup MCP
          </span>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div
            id="modal-step-loading"
            className={`modal-step${step === 'loading' ? ' active' : ''}`}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 0',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid rgba(163,230,53,.2)',
                  borderTopColor: 'var(--brand)',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                }}
              />
              <p
                className="modal-sub"
                style={{ margin: 0, textAlign: 'center' }}
              >
                Creating your{' '}
                <strong style={{ color: 'var(--text)' }}>Brainfish MCP</strong>{' '}
                key…
              </p>
            </div>
          </div>

          <div
            id="modal-step-login"
            className={`modal-step${step === 'login' ? ' active' : ''}`}
          >
            <div style={{ textAlign: 'center', padding: '.5rem 0 1rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: 'var(--brand-dim)',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <p className="modal-sub">
                Sign in to Brainfish to automatically generate your MCP config.
              </p>
            </div>

            <div
              id="modal-error"
              className={`modal-error${error ? ' visible' : ''}`}
            >
              {error}
            </div>

            <button
              type="button"
              className="mbtn mbtn-google"
              onClick={() => openLoginPopup('google')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div
            id="modal-step-waiting"
            className={`modal-step${step === 'waiting' ? ' active' : ''}`}
          >
            <div style={{ textAlign: 'center', padding: '.75rem 0 .5rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid rgba(163,230,53,.2)',
                  borderTopColor: 'var(--brand)',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p className="modal-sub" style={{ marginBottom: '1.5rem' }}>
                A sign-in window has opened.
                <br />
                Complete your login there, then click below.
              </p>
              <button
                type="button"
                className="mbtn"
                style={{ marginBottom: '.625rem' }}
                onClick={doneLogin}
              >
                I&apos;ve signed in — create my config
              </button>
              <button
                type="button"
                onClick={cancelLoginPopup}
                style={{
                  fontSize: '.8125rem',
                  color: 'var(--text-dim)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          <div
            id="modal-step-result"
            className={`modal-step${step === 'result' ? ' active' : ''}`}
          >
            <div className="modal-success-badge">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="5" fill="#a3e635" />
                <path
                  d="M3 5.2l1.3 1.3L7 3.5"
                  stroke="#171717"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Token created
            </div>

            <div
              style={{
                display: 'flex',
                gap: '.625rem',
                marginBottom: '.75rem',
              }}
            >
              <button
                type="button"
                id="modal-cursor-btn"
                className="cursor-install-btn"
                onClick={installInCursor}
              >
                <svg width="15" height="15" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="6" fill="#111" />
                  <path
                    d="M8 8l8 8-8 8M16 24h8"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add to Cursor
              </button>
              <button
                type="button"
                id="modal-claude-btn"
                className="claude-install-btn"
                onClick={addToClaude}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Add to Claude
              </button>
              <button
                type="button"
                id="modal-copy-btn"
                className="copy-config-btn"
                onClick={copyFilledConfig}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {copyBtnLabel}
              </button>
            </div>

            {claudeHintVisible ? (
              <div id="modal-claude-hint" className="modal-claude-hint">
                Double-click the downloaded{' '}
                <code>brainfish.mcpb</code> file to install it in Claude Desktop.
              </div>
            ) : null}

            <div className="modal-config">
              <div className="modal-config-bar">
                <span className="modal-config-filename">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#e8c27a"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  mcp.json
                </span>
              </div>
              <div className="modal-config-code">
                <pre id="modal-config-pre" />
              </div>
            </div>

            <button
              type="button"
              id="modal-logout-btn"
              className="modal-logout-btn"
              onClick={() => void logoutBF()}
              disabled={logoutBusy}
            >
              {logoutBusy ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

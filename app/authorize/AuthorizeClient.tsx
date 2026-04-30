'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@brainfish-ai/components/logo';
import styles from './authorize.module.css';

type Props = {
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  appUrl: string;
};

export function AuthorizeClient({
  clientName,
  redirectUri,
  state,
  codeChallenge,
  appUrl,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setBusy(false);
  }, []);

  const completeAuthorization = useCallback(
    (apiToken: string) => {
      const payload = JSON.stringify({
        token: apiToken,
        challenge: codeChallenge,
        exp: Date.now() + 5 * 60 * 1000,
      });
      const code = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const url =
        redirectUri +
        '?code=' +
        encodeURIComponent(code) +
        (state ? '&state=' + encodeURIComponent(state) : '');
      window.location.href = url;
    },
    [codeChallenge, redirectUri, state],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeModal]);

  useEffect(() => {
    if (modalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const cancelUrl =
    redirectUri +
    '?error=access_denied' +
    (state ? '&state=' + encodeURIComponent(state) : '');

  async function doAuthorize() {
    setBusy(true);
    const res = await fetch('/api/setup-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (res?.ok) {
      const data = (await res.json()) as { apiToken?: string };
      if (data.apiToken) {
        completeAuthorization(data.apiToken);
        return;
      }
    }
    setBusy(false);
    setModalError('');
    setModalOpen(true);
  }

  /** Full-page handoff to Platform; after login, user returns here with ?mcp_code= (see authorize/page.tsx). */
  function startPlatformHandoff() {
    setModalError('');
    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const url = `${appUrl.replace(/\/$/, '')}/api/mcp.connect?return_to=${encodeURIComponent(returnTo)}`;
    window.location.assign(url);
  }

  function onOverlayPointerDown(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closeModal();
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo variant="full" />
        </div>
        <h1 className={styles.title}>Connect to Brainfish</h1>
        <p className={styles.subtitle}>
          <strong>{clientName}</strong> is requesting access to your Brainfish knowledge base.
        </p>
        <div className={styles.scopeBox}>
          <div className={styles.scopeRow}>
            <span className={styles.scopeIcon}>✓</span> Search and read documents
          </div>
          <div className={styles.scopeRow}>
            <span className={styles.scopeIcon}>✓</span> Create and update content
          </div>
          <div className={styles.scopeRow}>
            <span className={styles.scopeIcon}>✓</span> Manage collections &amp; catalogs
          </div>
          <div className={styles.scopeRow}>
            <span className={styles.scopeIcon}>✓</span> Generate AI answers
          </div>
        </div>
        <div className={styles.divider} />
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={busy}
          onClick={() => void doAuthorize()}
        >
          {busy ? 'Authorizing…' : 'Authorize'}
        </button>
        {redirectUri ? (
          <a className={styles.btnCancel} href={cancelUrl}>
            Cancel
          </a>
        ) : null}
        <div className={styles.security}>
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Your authorization is processed securely and only used to complete this request.
        </div>
      </div>

      <div
        ref={overlayRef}
        id="auth-modal"
        className={`${styles.modalOverlay} ${modalOpen ? styles.modalOverlayOpen : ''}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={onOverlayPointerDown}
      >
        <div className={styles.modalCard}>
          <div className={styles.modalHeader}>
            <span className={styles.modalTitle}>Sign in to Brainfish</span>
            <button type="button" className={styles.modalClose} onClick={closeModal} aria-label="Close">
              ×
            </button>
          </div>
          <div className={styles.modalBody}>
            <div id="modal-step-login" className={`${styles.modalStep} ${styles.modalStepActive}`}>
              <p className={styles.modalSub}>
                You will be redirected to Brainfish to sign in (Google, email, or SSO). After signing in,
                you will return here to finish connecting.
              </p>
              <div className={`${styles.modalError} ${modalError ? styles.modalErrorVisible : ''}`}>
                {modalError}
              </div>
              <button type="button" className={styles.mbtn} onClick={startPlatformHandoff}>
                Continue to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

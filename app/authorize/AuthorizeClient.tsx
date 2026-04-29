'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@brainfish-ai/components/logo';
import styles from './authorize.module.css';

type ModalStep = 'login' | 'waiting' | 'loading';

type Props = {
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  appUrl: string;
};

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
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
  );
}

export function AuthorizeClient({
  clientName,
  redirectUri,
  state,
  codeChallenge,
  appUrl,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>('login');
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);

  const loginPopupRef = useRef<Window | null>(null);
  const loginTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const clearLoginTimer = useCallback(() => {
    if (loginTimerRef.current) {
      clearInterval(loginTimerRef.current);
      loginTimerRef.current = null;
    }
  }, []);

  const closePopup = useCallback(() => {
    const w = loginPopupRef.current;
    if (w && !w.closed) w.close();
    loginPopupRef.current = null;
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    clearLoginTimer();
    closePopup();
    setBusy(false);
  }, [clearLoginTimer, closePopup]);

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

  const callSetupTokenAndFinish = useCallback(async () => {
    try {
      const res = await fetch('/api/setup-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        apiToken?: string;
        error?: string;
        unauthenticated?: boolean;
      };
      if (!res.ok || data.error) {
        setStep('login');
        setModalError(
          data.unauthenticated
            ? 'Session expired. Please sign in again.'
            : data.error || 'Something went wrong. Please try again.',
        );
        return;
      }
      if (data.apiToken) completeAuthorization(data.apiToken);
    } catch {
      setStep('login');
      setModalError('Network error. Please check your connection and try again.');
    }
  }, [completeAuthorization]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== 'bf:auth-complete') return;
      clearLoginTimer();
      closePopup();
      setStep('loading');
      void callSetupTokenAndFinish();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [callSetupTokenAndFinish, clearLoginTimer, closePopup]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeModal]);

  useEffect(() => {
    return () => {
      clearLoginTimer();
      closePopup();
    };
  }, [clearLoginTimer, closePopup]);

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
    setStep('login');
    setModalOpen(true);
  }

  function openLoginPopup(provider: 'google' | 'email') {
    setModalError('');
    const authUrl =
      provider === 'email' ? `${appUrl}/auth/email` : `${appUrl}/auth/google`;
    const w = 520;
    const h = 640;
    const left = Math.max(0, (screen.width - w) / 2);
    const top = Math.max(0, (screen.height - h) / 2);
    const popup = window.open(
      authUrl,
      'brainfish-login',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`,
    );
    if (!popup) {
      window.open(authUrl, '_blank');
      setModalError(
        'Popup blocked. Allow popups and try again, or log in and click "I\'ve signed in" below.',
      );
      return;
    }
    loginPopupRef.current = popup;
    setStep('waiting');
    loginTimerRef.current = setInterval(() => {
      const p = loginPopupRef.current;
      if (!p || p.closed) {
        clearLoginTimer();
        loginPopupRef.current = null;
        setStep('loading');
        void callSetupTokenAndFinish();
      }
    }, 500);
  }

  function doneLogin() {
    clearLoginTimer();
    closePopup();
    setStep('loading');
    void callSetupTokenAndFinish();
  }

  function cancelLoginPopup() {
    clearLoginTimer();
    closePopup();
    setStep('login');
    setModalError('');
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
            <div
              id="modal-step-login"
              className={`${styles.modalStep} ${step === 'login' ? styles.modalStepActive : ''}`}
            >
              <p className={styles.modalSub}>Sign in to complete the authorization.</p>
              <div className={`${styles.modalError} ${modalError ? styles.modalErrorVisible : ''}`}>
                {modalError}
              </div>
              <button
                type="button"
                className={`${styles.mbtn} ${styles.mbtnGoogle}`}
                onClick={() => openLoginPopup('google')}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>
            <div
              id="modal-step-waiting"
              className={`${styles.modalStep} ${step === 'waiting' ? styles.modalStepActive : ''}`}
            >
              <div className={styles.waitingBlock}>
                <div className={styles.spinner} />
                <p className={styles.modalSub}>
                  A sign-in window has opened.
                  <br />
                  Complete your login there, then click below.
                </p>
                <button type="button" className={styles.mbtn} onClick={doneLogin} style={{ marginBottom: '0.5rem' }}>
                  I&apos;ve signed in — continue
                </button>
                <button type="button" className={styles.textBtn} onClick={cancelLoginPopup}>
                  Cancel
                </button>
              </div>
            </div>
            <div
              id="modal-step-loading"
              className={`${styles.modalStep} ${step === 'loading' ? styles.modalStepActive : ''}`}
            >
              <div className={styles.loadingBlock}>
                <div className={styles.spinner} />
                <p className={`${styles.modalSub}`} style={{ margin: 0, textAlign: 'center' }}>
                  Completing authorization…
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';

const LOGO = `<div style="display:flex;align-items:center;gap:8px">
  <svg height="32" viewBox="0 0 120 62" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.29092 46.9233L22.2216 30.5054L8.29092 14.1082C6.76144 12.3232 6.96812 9.64565 8.74562 8.10971C9.5517 7.42476 12.7967 6.40771 14.6982 8.56633L27.9055 24.1125C29.6353 22.3619 31.4401 20.7416 33.3113 19.2558C42.8873 11.6516 54.1988 7.57005 66.0599 7.57005C81.7681 7.57005 96.5049 14.7516 107.542 27.7448C108.885 29.343 108.885 31.6885 107.542 33.2867C96.5049 46.3006 81.7681 53.4614 66.0599 53.4614C54.2003 53.4614 42.8902 49.3664 33.3149 41.7715C31.4425 40.2863 29.6364 38.6673 27.9055 36.9189L14.6982 52.4651C13.1687 54.2502 10.5231 54.4577 8.74562 52.9218C6.98878 51.4066 6.78211 48.7083 8.29092 46.9233Z" fill="#A3E635"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.29086 46.9233L22.2215 30.5054L8.29086 14.1082C6.76137 12.3232 6.96804 9.64566 8.74554 8.10972C9.55163 7.42477 12.7966 6.40773 14.6981 8.56635L27.9054 24.1126C29.6352 22.3619 31.4401 20.7416 33.3112 19.2558C42.8873 11.6516 54.1988 7.57007 66.0599 7.57007C81.7681 7.57007 96.5049 14.7516 107.542 27.7448C108.885 29.343 108.885 31.6885 107.542 33.2867C96.5049 46.3007 81.7681 53.4615 66.0599 53.4615C54.2003 53.4615 42.8901 49.3664 33.3148 41.7715C31.4424 40.2863 29.6363 38.6673 27.9054 36.919L14.6981 52.4652C13.1686 54.2502 10.5231 54.4577 8.74554 52.9218C6.98871 51.4066 6.78204 48.7083 8.29086 46.9233ZM28.6098 47.3097C39.4227 55.9499 52.3664 60.7243 66.0599 60.7243C84.3681 60.7243 101.402 51.8192 113.104 37.9591C116.687 33.6973 116.672 27.2944 113.08 23.0438C100.801 8.58842 84.1057 0.307251 66.0599 0.307251C52.3707 0.307251 39.4243 5.06437 28.6063 13.7176L20.1508 3.76653C17.2688 0.494869 13.476 -0.136509 10.869 0.0223351C9.55831 0.1022 8.35268 0.378754 7.32846 0.740417C6.1197 1.16724 4.97045 1.77887 3.99434 2.61514C-0.796738 6.75509 -1.36906 13.9985 2.77293 18.8329L12.6921 30.5084L2.74133 42.2358C-1.31221 47.0313 -0.802719 54.2743 3.99434 58.4164C8.75052 62.5295 16.1286 61.9602 20.2161 57.1898L28.6098 47.3097Z" fill="#262626"/>
  </svg>
  <span style="font-family:'Inter',-apple-system,sans-serif;font-size:1.375rem;font-weight:700;color:#171717;letter-spacing:-0.02em">Brainfish</span>
</div>`;

function renderErrorPage(message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorization Error — Brainfish</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 32px rgba(0,0,0,.10);max-width:420px;width:100%;padding:2.25rem 2rem;text-align:center}
    .logo-wrap{display:flex;justify-content:center;margin-bottom:1.75rem}
    h1{font-size:1.125rem;font-weight:700;color:#171717;margin-bottom:.625rem}
    p{font-size:.875rem;color:#6b7280;line-height:1.6}
    .icon{width:44px;height:44px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-wrap">${LOGO}</div>
    <div class="icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
    <h1>Authorization Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function renderPage(opts: {
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  clientId: string;
  appUrl: string;
}) {
  const { clientName, redirectUri, state, codeChallenge, clientId, appUrl } = opts;
  const escapedClientName = clientName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const esc = (s: string) => s.replace(/"/g, '&quot;');
  const cancelUrl = `${esc(redirectUri)}?error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ''}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect to Brainfish</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root{--brand:#a3e635;--brand-dim:rgba(163,230,53,.12);--text:#171717;--text-dim:#6b7280}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 32px rgba(0,0,0,.10);max-width:420px;width:100%;padding:2.25rem 2rem}
    .logo-wrap{display:flex;justify-content:center;margin-bottom:1.75rem}
    .divider{height:1px;background:#e5e5e5;margin:1.5rem 0}
    h1{font-size:1.125rem;font-weight:700;color:#171717;text-align:center;margin-bottom:.375rem}
    .subtitle{font-size:.8125rem;color:#737373;text-align:center;margin-bottom:1.5rem;line-height:1.5}
    .subtitle strong{color:#171717}
    .scope-box{background:#f9fafb;border:1px solid #e5e5e5;border-radius:10px;padding:.875rem 1rem;margin-bottom:1.5rem}
    .scope-row{display:flex;align-items:center;gap:.625rem;font-size:.8125rem;color:#374151}
    .scope-row+.scope-row{margin-top:.5rem}
    .scope-icon{width:18px;height:18px;background:#a3e635;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.6rem;color:#171717;font-weight:700}
    .btn-primary{width:100%;padding:.75rem;background:#a3e635;color:#171717;font-weight:700;font-size:.9375rem;border:none;border-radius:9999px;cursor:pointer;transition:opacity .15s,transform .1s;margin-bottom:.75rem}
    .btn-primary:hover{opacity:.88;transform:translateY(-1px)}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .btn-cancel{display:block;text-align:center;font-size:.8125rem;color:#6b7280;text-decoration:none}
    .btn-cancel:hover{color:#374151}
    .security{display:flex;align-items:flex-start;gap:.5rem;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e5e5e5;font-size:.6875rem;color:#9ca3af;line-height:1.5}
    .security svg{flex-shrink:0;margin-top:1px;color:#d1d5db}
    /* Modal */
    .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);z-index:100;align-items:center;justify-content:center;padding:1rem}
    .modal-overlay.open{display:flex}
    .modal-card{background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);width:100%;max-width:380px;overflow:hidden}
    .modal-header{display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.25rem;border-bottom:1px solid #e5e5e5}
    .modal-title{font-size:.9375rem;font-weight:700;color:#171717}
    .modal-close{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:1.25rem;line-height:1;padding:.125rem .25rem}
    .modal-close:hover{color:#374151}
    .modal-body{padding:1.25rem}
    .modal-step{display:none}
    .modal-step.active{display:block}
    .modal-sub{font-size:.8125rem;color:#6b7280;line-height:1.6;margin-bottom:1rem}
    .modal-error{font-size:.8125rem;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.5rem .75rem;margin-bottom:.75rem;display:none}
    .modal-error.visible{display:block}
    .mbtn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.625rem 1rem;background:#f3f4f6;color:#171717;font-weight:600;font-size:.875rem;border:none;border-radius:8px;cursor:pointer;margin-bottom:.5rem;font-family:inherit}
    .mbtn:hover{background:#e5e7eb}
    .mbtn-google{background:#fff;border:1.5px solid #e5e5e5}
    .mbtn-google:hover{background:#f9fafb}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-wrap">${LOGO}</div>
    <h1>Connect to Brainfish</h1>
    <p class="subtitle"><strong>${escapedClientName}</strong> is requesting access to your Brainfish knowledge base.</p>
    <div class="scope-box">
      <div class="scope-row"><span class="scope-icon">✓</span> Search and read documents</div>
      <div class="scope-row"><span class="scope-icon">✓</span> Create and update content</div>
      <div class="scope-row"><span class="scope-icon">✓</span> Manage collections &amp; catalogs</div>
      <div class="scope-row"><span class="scope-icon">✓</span> Generate AI answers</div>
    </div>
    <div class="divider"></div>
    <button id="authorize-btn" class="btn-primary" onclick="doAuthorize()">Authorize</button>
    ${redirectUri ? `<a class="btn-cancel" href="${cancelUrl}">Cancel</a>` : ''}
    <div class="security">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      Your authorization is processed securely and only used to complete this request.
    </div>
  </div>

  <!-- Login modal — only shown when session is missing -->
  <div id="auth-modal" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title">Sign in to Brainfish</span>
        <button class="modal-close" onclick="closeModal()" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <!-- login step -->
        <div id="modal-step-login" class="modal-step active">
          <p class="modal-sub">Sign in to complete the authorization.</p>
          <div id="modal-error" class="modal-error"></div>
          <button class="mbtn mbtn-google" onclick="openLoginPopup('google')">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>
        <!-- waiting step -->
        <div id="modal-step-waiting" class="modal-step">
          <div style="text-align:center;padding:.75rem 0 .5rem">
            <div style="width:36px;height:36px;border:3px solid rgba(163,230,53,.2);border-top-color:#a3e635;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 1rem"></div>
            <p class="modal-sub">A sign-in window has opened.<br/>Complete your login there, then click below.</p>
            <button class="mbtn" onclick="doneLogin()" style="margin-bottom:.5rem">I've signed in — continue</button>
            <button onclick="cancelLoginPopup()" style="font-size:.8125rem;color:#6b7280;background:none;border:none;cursor:pointer;width:100%">Cancel</button>
          </div>
        </div>
        <!-- loading step -->
        <div id="modal-step-loading" class="modal-step">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 0;gap:1rem">
            <div style="width:36px;height:36px;border:3px solid rgba(163,230,53,.2);border-top-color:#a3e635;border-radius:50%;animation:spin .7s linear infinite"></div>
            <p class="modal-sub" style="margin:0;text-align:center">Completing authorization…</p>
          </div>
        </div>
      </div>
    </div>
  </div>

<script>
var __loginPopup = null;
var __loginTimer = null;
var __redirectUri = '${esc(redirectUri)}';
var __state = '${esc(state)}';
var __codeChallenge = '${esc(codeChallenge)}';

function showStep(name) {
  document.querySelectorAll('.modal-step').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('modal-step-' + name).classList.add('active');
}

function showModalError(msg) {
  var el = document.getElementById('modal-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function clearModalError() {
  var el = document.getElementById('modal-error');
  el.textContent = '';
  el.classList.remove('visible');
}

function openModal() {
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('auth-modal').classList.remove('open');
  document.body.style.overflow = '';
  if (__loginTimer) { clearInterval(__loginTimer); __loginTimer = null; }
  if (__loginPopup && !__loginPopup.closed) { __loginPopup.close(); __loginPopup = null; }
  var btn = document.getElementById('authorize-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Authorize'; }
}

function completeAuthorization(apiToken) {
  var payload = JSON.stringify({ token: apiToken, challenge: __codeChallenge, exp: Date.now() + 5 * 60 * 1000 });
  var code = btoa(payload).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
  var url = __redirectUri + '?code=' + encodeURIComponent(code) + (__state ? '&state=' + encodeURIComponent(__state) : '');
  window.location.href = url;
}

async function doAuthorize() {
  var btn = document.getElementById('authorize-btn');
  btn.disabled = true;
  btn.textContent = 'Authorizing…';
  var res = await fetch('/api/setup-token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(function() { return null; });
  if (res && res.ok) {
    var data = await res.json();
    if (data.apiToken) { completeAuthorization(data.apiToken); return; }
  }
  // Not logged in — open the modal
  btn.disabled = false;
  btn.textContent = 'Authorize';
  clearModalError();
  showStep('login');
  openModal();
}

window.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'bf:auth-complete') return;
  if (__loginTimer) { clearInterval(__loginTimer); __loginTimer = null; }
  if (__loginPopup && !__loginPopup.closed) { __loginPopup.close(); }
  __loginPopup = null;
  showStep('loading');
  callSetupTokenAndFinish();
});

function openLoginPopup(provider) {
  clearModalError();
  var authUrl = provider === 'email' ? '${esc(appUrl)}/auth/email' : '${esc(appUrl)}/auth/google';
  var w = 520, h = 640;
  var left = Math.max(0, (screen.width - w) / 2);
  var top = Math.max(0, (screen.height - h) / 2);
  __loginPopup = window.open(authUrl, 'brainfish-login', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',toolbar=no,menubar=no');
  if (!__loginPopup) {
    window.open(authUrl, '_blank');
    showModalError('Popup blocked. Allow popups and try again, or log in and click "I\\'ve signed in" below.');
    return;
  }
  showStep('waiting');
  __loginTimer = setInterval(function() {
    if (!__loginPopup || __loginPopup.closed) {
      clearInterval(__loginTimer); __loginTimer = null; __loginPopup = null;
      showStep('loading');
      callSetupTokenAndFinish();
    }
  }, 500);
}

function doneLogin() {
  if (__loginTimer) { clearInterval(__loginTimer); __loginTimer = null; }
  if (__loginPopup && !__loginPopup.closed) { __loginPopup.close(); }
  __loginPopup = null;
  showStep('loading');
  callSetupTokenAndFinish();
}

function cancelLoginPopup() {
  if (__loginTimer) { clearInterval(__loginTimer); __loginTimer = null; }
  if (__loginPopup && !__loginPopup.closed) { __loginPopup.close(); }
  __loginPopup = null;
  showStep('login');
  clearModalError();
}

async function callSetupTokenAndFinish() {
  try {
    var res = await fetch('/api/setup-token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    var data = await res.json();
    if (!res.ok || data.error) {
      showStep('login');
      showModalError(data.unauthenticated ? 'Session expired. Please sign in again.' : (data.error || 'Something went wrong. Please try again.'));
      return;
    }
    completeAuthorization(data.apiToken);
  } catch (err) {
    showStep('login');
    showModalError('Network error. Please check your connection and try again.');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('auth-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
});
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
</script>
</body>
</html>`;
}

const BRAINFISH_APP_URL = process.env.BRAINFISH_APP_URL || 'https://app.brainfi.sh';
const MCP_EXCHANGE_SECRET = process.env.MCP_EXCHANGE_SECRET ?? '';

async function verifyMcpCode(token: string, secret: string): Promise<{ apiToken: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT structure');

  const [headerB64, payloadB64, signatureB64] = parts;

  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    'HMAC', key, signature, new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) throw new Error('Invalid signature');

  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error('Token expired');

  return payload as { apiToken: string };
}

// GET — show the authorization form (or auto-complete via mcp_code)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const state = searchParams.get('state') ?? '';
  const codeChallenge = searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? 'S256';
  const clientId = searchParams.get('client_id') ?? '';
  const clientName = searchParams.get('client_name') ?? searchParams.get('client_id') ?? 'an AI assistant';
  const mcpCode = searchParams.get('mcp_code') ?? '';

  if (!redirectUri || !codeChallenge) {
    return new NextResponse(
      renderErrorPage('This page must be opened by an MCP client. The <code>redirect_uri</code> and <code>code_challenge</code> parameters are required.'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (!redirectUri.startsWith('https://') &&
      !redirectUri.startsWith('http://localhost') &&
      !redirectUri.startsWith('http://127.0.0.1')) {
    return new NextResponse(
      renderErrorPage('The <code>redirect_uri</code> must use HTTPS or point to localhost.'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Branch 1: returning from platform with a signed mcp_code — auto-complete
  if (mcpCode) {
    if (!MCP_EXCHANGE_SECRET) {
      return new NextResponse(
        renderErrorPage('MCP_EXCHANGE_SECRET is not configured on this server.'),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    let apiToken: string;
    try {
      const payload = await verifyMcpCode(mcpCode, MCP_EXCHANGE_SECRET);
      apiToken = payload.apiToken;
    } catch {
      return new NextResponse(
        renderErrorPage('The authorization code is invalid or expired. Please try again.'),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
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
    return NextResponse.redirect(callback.toString(), 302);
  }

  // Branch 2 (mcp_code handled above): always show the consent page.
  // The client-side JS handles login via the modal if the session cookie is absent.
  return new NextResponse(
    renderPage({ clientName, redirectUri, state, codeChallenge, codeChallengeMethod, clientId, appUrl: BRAINFISH_APP_URL }),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

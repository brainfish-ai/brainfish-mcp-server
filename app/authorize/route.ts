import { NextRequest, NextResponse } from 'next/server';

const LOGO = `<svg height="32" viewBox="0 0 400 62" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M8.29092 46.9233L22.2216 30.5054L8.29092 14.1082C6.76144 12.3232 6.96812 9.64565 8.74562 8.10971C9.5517 7.42476 12.7967 6.40771 14.6982 8.56633L27.9055 24.1125C29.6353 22.3619 31.4401 20.7416 33.3113 19.2558C42.8873 11.6516 54.1988 7.57005 66.0599 7.57005C81.7681 7.57005 96.5049 14.7516 107.542 27.7448C108.885 29.343 108.885 31.6885 107.542 33.2867C96.5049 46.3006 81.7681 53.4614 66.0599 53.4614C54.2003 53.4614 42.8902 49.3664 33.3149 41.7715C31.4425 40.2863 29.6364 38.6673 27.9055 36.9189L14.6982 52.4651C13.1687 54.2502 10.5231 54.4577 8.74562 52.9218C6.98878 51.4066 6.78211 48.7083 8.29092 46.9233Z" fill="#A3E635"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M8.29086 46.9233L22.2215 30.5054L8.29086 14.1082C6.76137 12.3232 6.96804 9.64566 8.74554 8.10972C9.55163 7.42477 12.7966 6.40773 14.6981 8.56635L27.9054 24.1126C29.6352 22.3619 31.4401 20.7416 33.3112 19.2558C42.8873 11.6516 54.1988 7.57007 66.0599 7.57007C81.7681 7.57007 96.5049 14.7516 107.542 27.7448C108.885 29.343 108.885 31.6885 107.542 33.2867C96.5049 46.3007 81.7681 53.4615 66.0599 53.4615C54.2003 53.4615 42.8901 49.3664 33.3148 41.7715C31.4424 40.2863 29.6363 38.6673 27.9054 36.919L14.6981 52.4652C13.1686 54.2502 10.5231 54.4577 8.74554 52.9218C6.98871 51.4066 6.78204 48.7083 8.29086 46.9233ZM28.6098 47.3097C39.4227 55.9499 52.3664 60.7243 66.0599 60.7243C84.3681 60.7243 101.402 51.8192 113.104 37.9591C116.687 33.6973 116.672 27.2944 113.08 23.0438C100.801 8.58842 84.1057 0.307251 66.0599 0.307251C52.3707 0.307251 39.4243 5.06437 28.6063 13.7176L20.1508 3.76653C17.2688 0.494869 13.476 -0.136509 10.869 0.0223351C9.55831 0.1022 8.35268 0.378754 7.32846 0.740417C6.1197 1.16724 4.97045 1.77887 3.99434 2.61514C-0.796738 6.75509 -1.36906 13.9985 2.77293 18.8329L12.6921 30.5084L2.74133 42.2358C-1.31221 47.0313 -0.802719 54.2743 3.99434 58.4164C8.75052 62.5295 16.1286 61.9602 20.2161 57.1898L28.6098 47.3097Z" fill="#262626"/>
  <path d="M140.328 5.62287V55.7183H131.553V5.62287H140.328ZM151.434 34.4055H137.655V27.0043H150.954C153.376 27.0043 155.227 26.4103 156.507 25.2225C157.787 23.9889 158.426 22.2528 158.426 20.0142C158.426 17.8669 157.764 16.2222 156.438 15.08C155.113 13.9378 153.193 13.3668 150.68 13.3668H137.38V5.62287H151.434C156.415 5.62287 160.323 6.83357 163.157 9.25496C165.99 11.6764 167.407 14.9886 167.407 19.1918C167.407 22.2071 166.676 24.7428 165.213 26.7987C163.751 28.8089 161.58 30.2709 158.701 31.1846V30.2252C161.808 30.9562 164.162 32.3268 165.762 34.337C167.361 36.3472 168.161 38.9513 168.161 42.1494C168.161 44.982 167.521 47.4262 166.242 49.4821C164.962 51.4923 163.088 53.0457 160.62 54.1422C158.198 55.193 155.273 55.7183 151.845 55.7183H137.38V47.9745H151.434C153.948 47.9745 155.867 47.3805 157.192 46.1927C158.518 45.0048 159.18 43.2916 159.18 41.0529C159.18 38.9513 158.495 37.3294 157.124 36.1873C155.798 34.9994 153.902 34.4055 151.434 34.4055Z" fill="#262626"/>
  <path d="M238.104 55.7183V21.8645H246.468V55.7183H238.104ZM242.218 15.08C240.801 15.08 239.59 14.6003 238.584 13.6409C237.624 12.6358 237.145 11.4251 237.145 10.0088C237.145 8.59251 237.624 7.40465 238.584 6.44523C239.59 5.48581 240.801 5.0061 242.218 5.0061C243.634 5.0061 244.823 5.48581 245.782 6.44523C246.788 7.40465 247.291 8.59251 247.291 10.0088C247.291 11.4251 246.788 12.6358 245.782 13.6409C244.823 14.6003 243.634 15.08 242.218 15.08Z" fill="#262626"/>
  <path d="M333.51 45.4388H341.462C341.508 46.9008 342.057 48.0658 343.108 48.9339C344.159 49.8019 345.621 50.2359 347.495 50.2359C349.506 50.2359 351.014 49.8704 352.02 49.1395C353.071 48.4085 353.596 47.4262 353.596 46.1927C353.596 45.3703 353.322 44.6393 352.774 43.9997C352.225 43.3601 351.197 42.8804 349.689 42.5606L343.588 41.1214C340.525 40.4361 338.24 39.3397 336.732 37.832C335.27 36.2787 334.538 34.1542 334.538 31.4587C334.538 29.2657 335.11 27.3697 336.252 25.7707C337.441 24.1717 339.04 22.961 341.051 22.1386C343.062 21.2706 345.37 20.8365 347.975 20.8365C350.489 20.8365 352.705 21.2934 354.625 22.2071C356.544 23.1209 358.03 24.4001 359.081 26.0448C360.178 27.6896 360.749 29.6084 360.795 31.8014H352.842C352.842 30.3394 352.385 29.1972 351.471 28.3749C350.557 27.5068 349.278 27.0728 347.632 27.0728C345.987 27.0728 344.707 27.4383 343.793 28.1693C342.879 28.9003 342.422 29.8825 342.422 31.1161C342.422 32.9892 343.885 34.2684 346.81 34.9537L352.911 36.3929C355.744 37.0325 357.87 38.0604 359.286 39.4767C360.749 40.893 361.48 42.9032 361.48 45.5074C361.48 47.7917 360.886 49.7791 359.698 51.4695C358.509 53.1142 356.841 54.3934 354.693 55.3072C352.545 56.1752 350.077 56.6092 347.289 56.6092C343.085 56.6092 339.726 55.5813 337.212 53.5254C334.744 51.4695 333.51 48.774 333.51 45.4388Z" fill="#262626"/>
</svg>`;

function renderPage(opts: {
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  clientId: string;
  error?: string;
}) {
  const { clientName, redirectUri, state, codeChallenge, codeChallengeMethod, clientId, error } = opts;
  const escapedClientName = clientName.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect to Brainfish</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
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
    label{display:block;font-size:.8125rem;font-weight:600;color:#374151;margin-bottom:.375rem}
    .field{margin-bottom:1rem}
    input[type=text],input[type=password]{width:100%;padding:.625rem .875rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:.875rem;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;color:#171717;background:#fff}
    input:focus{border-color:#a3e635;box-shadow:0 0 0 3px rgba(163,230,53,.15)}
    .optional-label{font-size:.6875rem;color:#9ca3af;font-weight:400;margin-left:.25rem}
    .get-token{font-size:.75rem;color:#6b7280;margin-top:.375rem}
    .get-token a{color:#a3e635;text-decoration:none;font-weight:500}
    .get-token a:hover{text-decoration:underline}
    .error-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.625rem .875rem;margin-bottom:1rem;font-size:.8125rem;color:#dc2626}
    .btn-primary{width:100%;padding:.75rem;background:#a3e635;color:#171717;font-weight:700;font-size:.9375rem;border:none;border-radius:9999px;cursor:pointer;transition:opacity .15s,transform .1s;margin-bottom:.75rem}
    .btn-primary:hover{opacity:.88;transform:translateY(-1px)}
    .btn-cancel{display:block;text-align:center;font-size:.8125rem;color:#6b7280;text-decoration:none}
    .btn-cancel:hover{color:#374151}
    .security{display:flex;align-items:flex-start;gap:.5rem;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e5e5e5;font-size:.6875rem;color:#9ca3af;line-height:1.5}
    .security svg{flex-shrink:0;margin-top:1px;color:#d1d5db}
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

    ${error ? `<div class="error-box">${error}</div>` : ''}

    <form method="POST">
      <input type="hidden" name="redirect_uri" value="${redirectUri.replace(/"/g, '&quot;')}" />
      <input type="hidden" name="state" value="${state.replace(/"/g, '&quot;')}" />
      <input type="hidden" name="code_challenge" value="${codeChallenge.replace(/"/g, '&quot;')}" />
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod.replace(/"/g, '&quot;')}" />
      <input type="hidden" name="client_id" value="${clientId.replace(/"/g, '&quot;')}" />

      <div class="field">
        <label for="api_key">API Token</label>
        <input type="password" id="api_key" name="api_key" placeholder="bf_api_••••••••••••" autocomplete="off" required />
        <div class="get-token">Don't have one? <a href="https://app.brainfi.sh/settings" target="_blank" rel="noopener">Get your API token →</a></div>
      </div>

      <div class="field">
        <label for="agent_key">Agent Key <span class="optional-label">(optional — for AI Answers)</span></label>
        <input type="password" id="agent_key" name="agent_key" placeholder="••••••••••••" autocomplete="off" />
      </div>

      <button type="submit" class="btn-primary">Authorize</button>
      ${redirectUri ? `<a class="btn-cancel" href="${redirectUri.replace(/"/g, '&quot;')}?error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ''}">Cancel</a>` : ''}
    </form>

    <div class="security">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      Your credentials are processed only to authenticate this request and are never stored on this server.
    </div>
  </div>
</body>
</html>`;
}

// GET — show the authorization form
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const state = searchParams.get('state') ?? '';
  const codeChallenge = searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? 'S256';
  const clientId = searchParams.get('client_id') ?? '';
  const clientName = searchParams.get('client_name') ?? searchParams.get('client_id') ?? 'an AI assistant';

  if (redirectUri && !redirectUri.startsWith('https://') &&
      !redirectUri.startsWith('http://localhost') &&
      !redirectUri.startsWith('http://127.0.0.1')) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri must be HTTPS or localhost' }, { status: 400 });
  }

  return new NextResponse(
    renderPage({ clientName, redirectUri, state, codeChallenge, codeChallengeMethod, clientId }),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// POST — handle form submission
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const apiKey     = (form.get('api_key') as string ?? '').trim();
  const agentKey   = (form.get('agent_key') as string ?? '').trim();
  const redirectUri           = form.get('redirect_uri') as string ?? '';
  const state                 = form.get('state') as string ?? '';
  const codeChallenge         = form.get('code_challenge') as string ?? '';
  const codeChallengeMethod   = form.get('code_challenge_method') as string ?? 'S256';
  const clientId              = form.get('client_id') as string ?? '';

  if (!apiKey) {
    return new NextResponse(
      renderPage({ clientName: clientId, redirectUri, state, codeChallenge, codeChallengeMethod, clientId, error: 'API token is required.' }),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Encode credentials + PKCE challenge into a short-lived auth code
  const codePayload = JSON.stringify({
    token: apiKey,
    ...(agentKey && { agentKey }),
    challenge: codeChallenge,
    exp: Date.now() + 5 * 60 * 1000, // 5 min
  });
  const code = Buffer.from(codePayload).toString('base64url');

  const callback = new URL(redirectUri);
  callback.searchParams.set('code', code);
  if (state) callback.searchParams.set('state', state);

  return NextResponse.redirect(callback.toString());
}

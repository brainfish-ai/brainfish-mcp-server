"use client";

import { useState, useEffect } from "react";

export default function TestOAuth() {
  const [verifier, setVerifier] = useState("");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [tokenResult, setTokenResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedVerifier = localStorage.getItem("pkce_verifier") ?? "";
    const storedChallenge = localStorage.getItem("pkce_challenge") ?? "";
    if (storedVerifier) {
      setVerifier(storedVerifier);
      setChallenge(storedChallenge);
    }

    const params = new URLSearchParams(window.location.search);
    const incomingCode = params.get("code");
    if (incomingCode) {
      setCode(incomingCode);
      window.history.replaceState({}, "", "/test-oauth");
    }
  }, []);

  async function generatePKCE() {
    const v = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
    )
      .replace(/[+/=]/g, "")
      .slice(0, 43);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(v)
    );
    const c = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setVerifier(v);
    setChallenge(c);
    setCode("");
    setTokenResult("");
    localStorage.setItem("pkce_verifier", v);
    localStorage.setItem("pkce_challenge", c);
  }

  function startAuthorize() {
    const params = new URLSearchParams({
      redirect_uri: `${window.location.origin}/test-oauth`,
      code_challenge: challenge,
      code_challenge_method: "S256",
      client_id: "test-client",
      client_name: "Test",
    });
    window.location.href = `/authorize?${params}`;
  }

  async function exchangeCode() {
    setLoading(true);
    try {
      const res = await fetch("/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          code_verifier: verifier,
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        const decoded = JSON.parse(
          atob(data.access_token.replace(/-/g, "+").replace(/_/g, "/"))
        );
        setTokenResult(JSON.stringify({ ...data, decoded }, null, 2));
      } else {
        setTokenResult(JSON.stringify(data, null, 2));
      }
    } finally {
      setLoading(false);
    }
  }

  const styles = {
    body: {
      fontFamily: "'Inter', sans-serif",
      background: "#f5f5f5",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    } as React.CSSProperties,
    card: {
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 4px 32px rgba(0,0,0,.10)",
      maxWidth: 520,
      width: "100%",
      padding: "2rem",
    } as React.CSSProperties,
    h1: {
      fontSize: "1.125rem",
      fontWeight: 700,
      marginBottom: "1.5rem",
      color: "#171717",
    } as React.CSSProperties,
    step: {
      marginBottom: "1.5rem",
      paddingBottom: "1.5rem",
      borderBottom: "1px solid #e5e5e5",
    } as React.CSSProperties,
    label: {
      fontSize: ".8125rem",
      fontWeight: 600,
      color: "#374151",
      display: "block",
      marginBottom: ".375rem",
    } as React.CSSProperties,
    code: {
      background: "#f3f4f6",
      borderRadius: 6,
      padding: ".5rem .75rem",
      fontSize: ".75rem",
      fontFamily: "monospace",
      wordBreak: "break-all",
      display: "block",
      marginBottom: ".75rem",
      color: "#374151",
    } as React.CSSProperties,
    btn: {
      padding: ".5rem 1.25rem",
      background: "#a3e635",
      color: "#171717",
      fontWeight: 700,
      fontSize: ".875rem",
      border: "none",
      borderRadius: 9999,
      cursor: "pointer",
    } as React.CSSProperties,
    btnDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    } as React.CSSProperties,
    pre: {
      background: "#f3f4f6",
      borderRadius: 6,
      padding: ".75rem",
      fontSize: ".75rem",
      fontFamily: "monospace",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      marginTop: ".75rem",
    } as React.CSSProperties,
    badge: (ok: boolean) =>
      ({
        display: "inline-block",
        background: ok ? "#dcfce7" : "#fef9c3",
        color: ok ? "#166534" : "#854d0e",
        fontSize: ".6875rem",
        fontWeight: 600,
        padding: ".125rem .5rem",
        borderRadius: 9999,
        marginLeft: ".5rem",
      }) as React.CSSProperties,
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h1 style={styles.h1}>OAuth PKCE Test</h1>

        {/* Step 1 */}
        <div style={styles.step}>
          <span style={styles.label}>
            Step 1 — Generate PKCE pair
            {challenge && <span style={styles.badge(true)}>done</span>}
          </span>
          <button style={styles.btn} onClick={generatePKCE}>
            Generate
          </button>
          {challenge && (
            <>
              <code style={{ ...styles.code, marginTop: ".75rem" }}>
                verifier: {verifier}
              </code>
              <code style={styles.code}>challenge: {challenge}</code>
            </>
          )}
        </div>

        {/* Step 2 */}
        <div style={styles.step}>
          <span style={styles.label}>
            Step 2 — Authorize
            {code && <span style={styles.badge(true)}>code received</span>}
          </span>
          <button
            style={{
              ...styles.btn,
              ...(!challenge ? styles.btnDisabled : {}),
            }}
            onClick={startAuthorize}
            disabled={!challenge}
          >
            Open /authorize →
          </button>
          {code && (
            <code style={{ ...styles.code, marginTop: ".75rem" }}>
              code: {code.slice(0, 40)}…
            </code>
          )}
        </div>

        {/* Step 3 */}
        <div>
          <span style={styles.label}>
            Step 3 — Exchange code for token
            {tokenResult && (
              <span style={styles.badge(!tokenResult.includes('"error"'))}>
                {tokenResult.includes('"error"') ? "error" : "success"}
              </span>
            )}
          </span>
          <button
            style={{ ...styles.btn, ...(!code ? styles.btnDisabled : {}) }}
            onClick={exchangeCode}
            disabled={!code || loading}
          >
            {loading ? "Exchanging…" : "Exchange →"}
          </button>
          {tokenResult && <pre style={styles.pre}>{tokenResult}</pre>}
        </div>
      </div>
    </div>
  );
}

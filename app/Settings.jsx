/* Settings — BYOK API keys / proxy sessions (localStorage only) + GitHub OAuth (simulated). */

function KeyRow({ provider, keys, setKeys }) {
  const [show, setShow] = React.useState(false);
  const isCodex = provider.id === "codex";
  const value = isCodex ? (keys.codexSession || "") : (keys[provider.id] || "");
  const proxyValue = keys.codexProxy || "";
  const useCookie = !!keys.codexUseCookie;
  const ok = provider.isConfigured ? provider.isConfigured(keys) : !!value;
  const status = ok ? "● connected" : isCodex && proxyValue ? "○ login needed" : isCodex ? "○ no proxy" : "○ no key";
  const update = (patch) => setKeys({ ...keys, ...patch });
  const openCodexLogin = () => {
    const url = provider.loginUrl(keys);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ProviderDot provider={provider.id} size={11} />
        <span className="display" style={{ fontSize: 17 }}>{provider.label}</span>
        <span className={"chip"} style={{ marginLeft: "auto", color: ok ? "var(--good)" : "var(--faint)", borderColor: ok ? "var(--good)" : "var(--hairline)" }}>
          {status}
        </span>
      </div>
      {isCodex && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="field mono" type="url" placeholder={provider.proxyHint} value={proxyValue}
              onChange={(e) => update({ codexProxy: e.target.value.trim() })} style={{ fontSize: 12.5 }} autoComplete="off" />
            <button className="btn btn-sm btn-dark" onClick={openCodexLogin} disabled={!proxyValue}>Login</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="field mono" type={show ? "text" : "password"} placeholder={provider.keyHint} value={value}
              onChange={(e) => update({ codexSession: e.target.value.trim() })} style={{ fontSize: 12.5 }} autoComplete="off" />
            <button className="btn btn-sm btn-ghost" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
            <input type="checkbox" checked={useCookie} onChange={(e) => update({ codexUseCookie: e.target.checked })} />
            Use proxy cookie session
          </label>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
            The proxy keeps Codex auth server-side. This page stores only the proxy URL and optional proxy session handle.
          </div>
        </>
      )}
      {!isCodex && (
        <div style={{ display: "flex", gap: 8 }}>
          <input className="field mono" type={show ? "text" : "password"} placeholder={provider.keyHint} value={value}
            onChange={(e) => update({ [provider.id]: e.target.value.trim() })} style={{ fontSize: 12.5 }} autoComplete="off" />
          <button className="btn btn-sm btn-ghost" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono faint" style={{ fontSize: 10.5 }}>models: {provider.models.slice(0, 3).join(", ")}{provider.models.length > 3 ? "…" : ""}</span>
        <span className="mono faint" style={{ fontSize: 10.5 }}>{provider.docs}</span>
      </div>
    </div>
  );
}

function Settings({ keys, setKeys, githubUser, onConnectGithub, onDisconnectGithub }) {
  return (
    <div className="shell" style={{ padding: "34px 28px 80px", maxWidth: 860 }}>
      <div className="kicker" style={{ marginBottom: 10 }}>Settings · bring your own key</div>
      <h1 className="display" style={{ fontSize: 38, margin: 0 }}>Connect your accounts.</h1>
      <p className="muted" style={{ fontSize: 15, marginTop: 10, lineHeight: 1.5, maxWidth: 600 }}>
        Prompt Golf runs entirely in your browser. Provider keys and proxy sessions are stored in <span className="mono">localStorage</span> on this device only. Codex login is handled by the proxy URL you control.
      </p>

      {/* github */}
      <div className="card" style={{ padding: 18, marginTop: 28, display: "flex", alignItems: "center", gap: 16, background: "var(--inset)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="github" size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18 }}>GitHub identity</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {githubUser ? <>Signed in as <b>@{githubUser.login}</b> — submissions post under your handle.</> : "Sign in to claim leaderboard entries and a public profile."}
          </div>
        </div>
        {githubUser ? (
          <button className="btn btn-ghost" onClick={onDisconnectGithub}>Disconnect</button>
        ) : (
          <button className="btn btn-dark" onClick={onConnectGithub}><Icon name="github" size={16} /> Sign in with GitHub</button>
        )}
      </div>

      <div className="kicker" style={{ margin: "30px 0 14px" }}>Provider keys & login proxies</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {window.PROVIDER_LIST.map((p) => (
          <KeyRow key={p.id} provider={p} keys={keys} setKeys={setKeys} />
        ))}
      </div>

      <div className="card" style={{ marginTop: 20, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: "var(--warn)", marginTop: 1 }}><Icon name="lock" size={16} /></span>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <b style={{ color: "var(--ink)" }}>Where this goes in production.</b> Client-side BYOK is great for a demo but exposes keys to the page. Codex login is stricter: keep <span className="mono">~/.codex/auth.json</span> only in a trusted proxy or local runner. A shipped version re-runs each submission server-side before it lands on the public board — that's the anti-cheat story.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Settings });

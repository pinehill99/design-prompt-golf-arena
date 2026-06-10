/* Prompt Golf — root app. Routes between Challenges, Arena, Leaderboard, Settings. */
const { useState, useEffect } = React;

function HowItWorks({ open, onClose }) {
  const steps = [
    ["Pick a target", "Choose any of 56 design systems from the awesome-design-md catalog. Each ships a DESIGN.md spec."],
    ["Write the shortest prompt", "Describe the page so a model can rebuild it. Only your prompt text is counted — fewer tokens is a better golf score."],
    ["Run it live with your key", "Your prompt goes to Anthropic / OpenAI / Codex OAuth proxy / Google / Mistral at the model & reasoning effort you choose."],
    ["Get scored", "The render is captured and judged against the spec: a vision rubric (color/type/layout/components), plus a pixel-diff heatmap for ★ targets."],
    ["Climb the board", "Submit under your GitHub handle. Leaderboards rank by fewest tokens at a fidelity gate, split by model × reasoning effort."],
  ];
  return (
    <Modal open={open} onClose={onClose} title="How Prompt Golf works" width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {steps.map(([t, d], i) => (
          <div key={i} style={{ display: "flex", gap: 14 }}>
            <div className="display" style={{ fontSize: 22, color: "var(--accent)", width: 28, flexShrink: 0, lineHeight: 1 }}>{i + 1}</div>
            <div>
              <div className="display" style={{ fontSize: 16, marginBottom: 3 }}>{t}</div>
              <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{d}</div>
            </div>
          </div>
        ))}
        <div className="mono faint" style={{ fontSize: 11, lineHeight: 1.5, borderTop: "1px solid var(--hairline)", paddingTop: 14 }}>
          Targets are recreated from their plain-text DESIGN.md spec — an original interpretation, not a 1:1 brand clone.
        </div>
      </div>
    </Modal>
  );
}

function App() {
  const { usePersistentState, seedLeaderboard } = window.Store;
  const [route, setRoute] = useState("challenges"); // challenges | arena | leaderboard | settings
  const [active, setActive] = useState(null); // active challenge
  const [theme, setTheme] = usePersistentState("pg_theme", "standard");
  const [keys, setKeys] = usePersistentState("pg_keys", {});
  const [githubUser, setGithubUser] = usePersistentState("pg_github", null);
  const [mine, setMine] = usePersistentState("pg_submissions", []);
  const [howOpen, setHowOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [toast, showToast] = useToast();

  const challenges = window.CHALLENGES;
  const seed = React.useMemo(() => seedLeaderboard(challenges), [challenges]);
  const board = React.useMemo(() => [...seed, ...mine], [seed, mine]);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  // expose theme setter for Tweaks panel
  useEffect(() => { window.__setTheme = setTheme; window.__getTheme = () => theme; }, [theme]);

  function openArena(ch) { setActive(ch); setRoute("arena"); window.scrollTo(0, 0); }
  function go(r) { setRoute(r); window.scrollTo(0, 0); }

  function connectGithub() {
    setConnecting(true);
    setTimeout(() => {
      const handles = ["octogolfer", "you-dev", "prompt-smith"];
      setGithubUser({ login: handles[Math.floor(Math.random() * handles.length)], n: Math.floor(Math.random() * 900) });
      setConnecting(false);
      showToast("Signed in with GitHub", "github");
    }, 1100);
  }

  const keyCount = window.PROVIDER_LIST.filter((p) => p.isConfigured ? p.isConfigured(keys) : !!keys[p.id]).length;

  return (
    <div className="app">
      {/* top bar */}
      <header className="topbar">
        <div className="shell topbar-in">
          <div className="wordmark" style={{ cursor: "pointer" }} onClick={() => go("challenges")}>
            <span className="mk" />Prompt&#8202;Golf
            <span className="tag">par · tokens</span>
          </div>
          <nav className="tabs">
            {[["challenges", "grid", "Library"], ["arena", "target", "Arena"], ["leaderboard", "trophy", "Leaderboard"]].map(([r, ic, lbl]) => {
              const on = route === r;
              return (
                <button key={r} className="tab" aria-current={on}
                  style={on ? { background: "var(--ink)", color: "var(--accent-ink)" } : undefined}
                  onClick={() => r === "arena" ? (active ? setRoute("arena") : showToast("Pick a target first", "target")) : go(r)}>
                  <Icon name={ic} size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />{lbl}
                </button>
              );
            })}
          </nav>
          <div className="topbar-right">
            <button className="btn btn-ghost btn-sm" onClick={() => setHowOpen(true)}>How it works</button>
            <button className={"btn btn-sm" + (keyCount ? "" : " btn-ghost")} onClick={() => go("settings")} style={keyCount ? {} : { color: "var(--accent)", borderColor: "var(--accent)" }}>
              <Icon name="sliders" size={14} /> {keyCount ? keyCount + " keys" : "Add keys"}
            </button>
            {githubUser ? (
              <button className="btn btn-sm btn-ghost" onClick={() => go("settings")} title={"@" + githubUser.login} style={{ paddingLeft: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center" }}><Icon name="github" size={13} /></span>
                @{githubUser.login}
              </button>
            ) : (
              <button className="btn btn-dark btn-sm" onClick={connectGithub} disabled={connecting}>
                {connecting ? <span className="spin" /> : <Icon name="github" size={14} />} {connecting ? "" : "Sign in"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {route === "challenges" && <Challenges challenges={challenges} board={board} onOpen={openArena} />}
        {route === "arena" && active && <Arena challenge={active} keys={keys} githubUser={githubUser} onBack={() => go("challenges")} onSubmit={(s) => setMine([...mine, s])} showToast={showToast} />}
        {route === "leaderboard" && <Leaderboard challenges={challenges} board={board} onOpen={openArena} />}
        {route === "settings" && <Settings keys={keys} setKeys={setKeys} githubUser={githubUser} onConnectGithub={connectGithub} onDisconnectGithub={() => { setGithubUser(null); showToast("Signed out", "x"); }} />}
      </main>

      {/* footer */}
      <footer style={{ borderTop: "1px solid var(--hairline)", padding: "22px 0" }}>
        <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span className="mono faint" style={{ fontSize: 11 }}>Prompt Golf · targets sourced from VoltAgent/awesome-design-md · BYOK/proxy, client-side</span>
          <span className="mono faint" style={{ fontSize: 11 }}>{challenges.length} targets · {board.length} runs logged</span>
        </div>
      </footer>

      <HowItWorks open={howOpen} onClose={() => setHowOpen(false)} />
      <Toast toast={toast} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

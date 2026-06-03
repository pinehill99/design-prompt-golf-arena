/* Arena — write a prompt, run it live (BYOK), render, score against the spec. */

const ARENA_SYSTEM =
  "You are an expert front-end designer. The user describes a web page to build. " +
  "Output ONE complete, self-contained HTML document (DOCTYPE, inline <style>, Google Fonts allowed via <link>/@import, no other external assets) " +
  "that realizes their description as a polished hero / landing section. " +
  "Return ONLY the HTML. No prose, no markdown code fences.";

const SAMPLE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:system-ui,sans-serif;background:#f3f1ec;color:#1f1d18}
.nav{display:flex;justify-content:space-between;padding:20px 40px;align-items:center}
.brand{display:flex;gap:8px;align-items:center;font-weight:700}.brand i{width:18px;height:18px;border-radius:5px;background:#c25a3d;display:inline-block}
.h{max-width:680px;margin:90px auto;padding:0 24px}
h1{font-size:54px;line-height:1.05;letter-spacing:-.02em;margin:0}
p{color:#6c685c;font-size:18px;line-height:1.5;margin-top:22px}
.b{margin-top:32px;display:flex;gap:12px}
button{border:none;border-radius:999px;padding:13px 24px;font-size:15px;cursor:pointer}
.p{background:#c25a3d;color:#fff}.g{background:transparent;border:1px solid #ddd}
</style></head><body><div class="nav"><div class="brand"><i></i>Brand</div><div style="color:#888">Docs · Pricing · Login</div></div>
<div class="h"><h1>A thoughtful assistant you can think alongside.</h1><p>Helpful, honest, and designed to stay out of your way while you work.</p>
<div class="b"><button class="p">Get started</button><button class="g">Read docs</button></div></div></body></html>`;

function Selector({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span className="mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>{label}</span>
      {children}
    </div>
  );
}

function SpecView({ ch }) {
  const s = ch.spec;
  const Sec = ({ k, children }) => (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--hairline)" }}>
      <div className="kicker" style={{ marginBottom: 6 }}>{k}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>{children}</div>
    </div>
  );
  return (
    <div>
      <Sec k="Overview">{s.overview}</Sec>
      <Sec k="Palette">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.palette.map((p, i) => {
            const hex = (p.match(/#[0-9a-fA-F]{3,8}/) || [])[0];
            return <span key={i} className="chip">{hex && <span className="swatch" style={{ background: hex }} />}{p}</span>;
          })}
        </div>
      </Sec>
      <Sec k="Typography"><b>Display:</b> {s.type.display}<br /><b>Body:</b> {s.type.body}</Sec>
      <Sec k="Layout">{s.layout}</Sec>
      <Sec k="Components">{s.components}</Sec>
      <Sec k="Motion">{s.motion}</Sec>
    </div>
  );
}

function Arena({ challenge, keys, githubUser, onBack, onSubmit, showToast }) {
  const { usePersistentState } = window.Store;
  const [prompt, setPrompt] = usePersistentState("pg_prompt_" + challenge.slug, "");
  const [providerId, setProviderId] = usePersistentState("pg_provider", "anthropic");
  const [effort, setEffort] = usePersistentState("pg_effort", "medium");
  const [models, setModels] = usePersistentState("pg_models", {});
  const provider = window.PROVIDERS[providerId];
  const model = models[providerId] || provider.models[0];
  const setModel = (m) => setModels({ ...models, [providerId]: m });

  const [leftTab, setLeftTab] = React.useState("prompt");
  const [previewTab, setPreviewTab] = React.useState("render");
  const [phase, setPhase] = React.useState("idle"); // idle | generating | scoring
  const [html, setHtml] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const renderRef = React.useRef(null);
  const refRef = React.useRef(null);
  const pending = React.useRef(null); // {mode}
  const genMeta = React.useRef({ input: 0, output: 0, ms: 0 });

  const golfTokens = window.estimateTokens(prompt);
  const hasKey = provider.isConfigured ? provider.isConfigured(keys) : !!keys[providerId];

  React.useEffect(() => { setSubmitted(false); }, [result]);

  async function run() {
    if (!hasKey) { showToast("Configure " + provider.label + " in Settings", "lock"); return; }
    if (!prompt.trim()) { showToast("Write a prompt first", "x"); return; }
    setError(null); setResult(null); setSubmitted(false); setHtml(""); setPreviewTab("render");
    setPhase("generating");
    try {
      const gen = await provider.complete({ key: keys[providerId], keys, system: ARENA_SYSTEM, prompt, model, effort });
      genMeta.current = { input: gen.usage.input, output: gen.usage.output, ms: gen.ms };
      if (!gen.text || !/</.test(gen.text)) throw new Error("Model returned no HTML.");
      pending.current = { mode: "live" };
      setPhase("scoring");
      setHtml(gen.text);
    } catch (e) {
      setError(e.message || String(e)); setPhase("idle");
    }
  }

  function loadSample() {
    setError(null); setResult(null); setSubmitted(false); setPreviewTab("render");
    genMeta.current = { input: golfTokens + 180, output: 720, ms: 4200 };
    pending.current = { mode: "sample" };
    setPhase("scoring");
    setHtml(SAMPLE_HTML);
  }

  // when the render iframe finishes loading and a score is pending, capture & score
  async function onRenderLoad() {
    if (!pending.current) return;
    const mode = pending.current.mode; pending.current = null;
    try {
      await new Promise((r) => setTimeout(r, 750)); // let fonts/layout settle
      const candCanvas = await window.Scoring.captureIframe(renderRef.current, 1000);
      const candUrl = window.Scoring.canvasToDataUrl(candCanvas, 900);

      // pixel diff for featured targets
      let pixel = null;
      if (challenge.featured && refRef.current) {
        try {
          const refCanvas = await window.Scoring.captureIframe(refRef.current, 1000);
          pixel = window.Scoring.pixelDiff(candCanvas, refCanvas);
        } catch (e) { /* ignore */ }
      }

      // rubric judge
      let judge;
      if (mode === "sample") {
        judge = sampleJudge(challenge, pixel);
      } else {
        try {
          judge = await window.Scoring.judge({ provider, key: keys[providerId], keys, challenge, imageDataUrl: candUrl, model: provider.visionModel });
        } catch (e) {
          judge = { fidelity: pixel ? pixel.similarity : 70, scores: { color: 70, typography: 70, layout: 70, components: 70 }, wrong: ["Vision judge unavailable: " + (e.message || "error").slice(0, 40)], good: [], summary: "Scored on pixel diff only." };
        }
      }

      const fidelity = pixel ? Math.round(judge.fidelity * 0.5 + pixel.similarity * 0.5) : judge.fidelity;
      setResult({
        golfTokens, apiInput: genMeta.current.input, apiOutput: genMeta.current.output, ms: genMeta.current.ms,
        fidelity, scores: judge.scores, wrong: judge.wrong, good: judge.good, summary: judge.summary, pixel,
        provider: providerId, model, effort,
      });
      setPhase("idle");
    } catch (e) {
      setError("Scoring failed: " + (e.message || e)); setPhase("idle");
    }
  }

  function submit() {
    onSubmit({
      id: "me-" + Date.now(), challenge: challenge.slug,
      handle: githubUser ? githubUser.login : "you", you: true,
      provider: result.provider, model: result.model, effort: result.effort,
      tokens: result.golfTokens, fidelity: result.fidelity, turns: 1, ts: Date.now(),
    });
    setSubmitted(true);
    showToast("Added to the " + challenge.name + " board", "trophy");
  }

  const busy = phase !== "idle";

  return (
    <div className="shell" style={{ padding: "20px 28px 70px" }}>
      {/* arena header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow-left" size={15} /> Library</button>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: challenge.accent }} />
          <span className="display" style={{ fontSize: 22 }}>{challenge.name}</span>
          <span className={"tag-diff diff-" + challenge.difficulty}>{challenge.difficulty}</span>
          {challenge.featured && <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>pixel-diff</span>}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <Selector label="Provider">
            <select className="field" style={{ padding: "8px 10px", width: 120 }} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {window.PROVIDER_LIST.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Selector>
          <Selector label="Model">
            <input className="field" style={{ padding: "8px 10px", width: 168, fontFamily: "var(--mono)", fontSize: 12 }} value={model} onChange={(e) => setModel(e.target.value)} list={"models-" + providerId} />
            <datalist id={"models-" + providerId}>{provider.models.map((m) => <option key={m} value={m} />)}</datalist>
          </Selector>
          <Selector label="Reasoning">
            <div className="seg">
              {window.EFFORTS.map((ef) => (
                <button key={ef} className={effort === ef ? "on" : ""} onClick={() => setEffort(ef)} disabled={!provider.supportsEffort} style={!provider.supportsEffort ? { opacity: .4 } : {}}>{ef}</button>
              ))}
            </div>
          </Selector>
          <button className="btn btn-accent btn-lg btn-sq" onClick={run} disabled={busy} style={{ minWidth: 110, justifyContent: "center" }}>
            {busy ? <><span className="spin" /> {phase}</> : <><Icon name="play" size={15} fill /> Run</>}
          </button>
        </div>
      </div>

      {/* two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 0.85fr) 1.15fr", gap: 18, alignItems: "start" }}>
        {/* LEFT */}
        <div className="card" style={{ overflow: "hidden", position: "sticky", top: 78 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--hairline)" }}>
            {["prompt", "spec"].map((t) => (
              <button key={t} onClick={() => setLeftTab(t)} className="mono" style={{ flex: 1, padding: "12px", background: leftTab === t ? "var(--surface)" : "var(--inset)", border: "none", borderBottom: leftTab === t ? "2px solid var(--accent)" : "2px solid transparent", color: leftTab === t ? "var(--ink)" : "var(--muted)", cursor: "pointer", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>
                {t === "prompt" ? "Your prompt" : "Target spec"}
              </button>
            ))}
          </div>
          <div style={{ padding: 16 }}>
            {leftTab === "prompt" ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="lbl" style={{ margin: 0 }}>Prompt → {provider.label}</label>
                  <span className="mono" style={{ fontSize: 11.5, color: golfTokens > 250 ? "var(--warn)" : "var(--good)" }}>~{golfTokens} tok · {prompt.length} ch</span>
                </div>
                <textarea className="field" rows={11} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder={"Describe " + challenge.name + " so the model can rebuild it. Every token counts — be precise and terse.\n\ne.g. \"Cream page, serif headline, one terracotta pill button, centered 720px column…\""} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 }}>
                  <span className="mono faint" style={{ fontSize: 11 }}>System scaffold is fixed & free · only your prompt is scored</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPrompt("")}>Clear</button>
                </div>
                {error && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--accent)", background: "var(--accent-soft)", padding: "10px 12px", borderRadius: "var(--r)", lineHeight: 1.4 }}>⚠ {error}</div>}
              </div>
            ) : <SpecView ch={challenge} />}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* preview */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--hairline)", padding: "0 6px" }}>
              {[["render", "Your render"], challenge.featured && ["target", "Target"], result && result.pixel && ["diff", "Diff"]].filter(Boolean).map(([t, lbl]) => (
                <button key={t} onClick={() => setPreviewTab(t)} className="mono" style={{ padding: "11px 14px", background: "transparent", border: "none", borderBottom: previewTab === t ? "2px solid var(--accent)" : "2px solid transparent", color: previewTab === t ? "var(--ink)" : "var(--muted)", cursor: "pointer", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>{lbl}</button>
              ))}
              <span className="mono faint" style={{ marginLeft: "auto", fontSize: 10.5, paddingRight: 10 }}>1000px viewport</span>
            </div>
            <div style={{ position: "relative", height: 460, background: "var(--inset)" }}>
              {/* render frame */}
              <iframe ref={renderRef} title="render" srcDoc={html} onLoad={onRenderLoad} sandbox="allow-same-origin"
                style={{ width: "100%", height: "100%", border: "none", display: previewTab === "render" ? "block" : "none", background: "#fff" }} />
              {/* target frame (featured) */}
              {challenge.featured && (
                <iframe ref={refRef} title="target" src={challenge.ref} sandbox="allow-same-origin"
                  style={{ width: "100%", height: "100%", border: "none", display: previewTab === "target" ? "block" : "none", background: "#fff" }} />
              )}
              {/* diff */}
              {previewTab === "diff" && result && result.pixel && (
                <div style={{ position: "absolute", inset: 0, overflow: "auto", display: "grid", placeItems: "center", padding: 16 }}>
                  <img src={result.pixel.heatmapDataUrl} alt="diff" style={{ maxWidth: "60%", borderRadius: 4, border: "1px solid var(--hairline)" }} />
                </div>
              )}
              {/* empty / busy overlay on render tab */}
              {previewTab === "render" && !html && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
                  {phase === "generating" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <span className="spin" style={{ width: 24, height: 24 }} />
                      <span className="mono muted" style={{ fontSize: 12 }}>{provider.label} is generating…</span>
                    </div>
                  ) : (
                    <div>
                      <div className="faint" style={{ marginBottom: 12 }}><Icon name="target" size={30} /></div>
                      <div className="mono muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>Write a prompt and hit Run.<br />Your generated page renders here.</div>
                      <button className="btn btn-ghost btn-sm" onClick={loadSample} style={{ marginTop: 16 }}>Preview scoring with a sample</button>
                    </div>
                  )}
                </div>
              )}
              {phase === "scoring" && (
                <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--bg) 60%, transparent)", display: "grid", placeItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <span className="spin" style={{ width: 24, height: 24 }} />
                    <span className="mono muted" style={{ fontSize: 12 }}>capturing & judging…</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* score */}
          {result ? (
            <ScorePanel result={result} challenge={challenge} onSubmit={submit} submitted={submitted} />
          ) : (
            <div className="card" style={{ padding: 22, textAlign: "center" }}>
              <div className="mono faint" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                Score appears here after a run — fidelity ring, vision rubric{challenge.featured ? ", pixel-diff heatmap" : ""}, tokens & efficiency.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function sampleJudge(ch, pixel) {
  const base = pixel ? pixel.similarity : 82;
  const j = (n) => Math.max(40, Math.min(98, Math.round(base + n)));
  return {
    fidelity: j(0),
    scores: { color: j(6), typography: j(-8), layout: j(3), components: j(-4) },
    good: ["Centered single-column hero", "Terracotta accent on primary button", "Generous negative space"],
    wrong: ["Headline not serif enough", "Button radius slightly too round", "Sub-text color a touch dark"],
    summary: "Strong structural match; typography is the weakest axis.",
  };
}

Object.assign(window, { Arena });

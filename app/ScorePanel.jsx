/* Score panel — shown after a run is scored. Pure presentational. */

function StatBlock({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="kicker" style={{ marginBottom: 6 }}>{label}</div>
      <div className="display" style={{ fontSize: 30, color: accent || "var(--ink)", lineHeight: 1 }}>{value}</div>
      {sub && <div className="mono faint" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RubricRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
      <div className="mono" style={{ fontSize: 11.5, width: 92, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div style={{ flex: 1 }}><Bar value={value} color={value >= 90 ? "var(--good)" : value >= 70 ? "var(--accent)" : "var(--warn)"} /></div>
      <div className="mono" style={{ fontSize: 12, width: 28, textAlign: "right" }}>{Math.round(value)}</div>
    </div>
  );
}

function ScorePanel({ result, challenge, onSubmit, submitted }) {
  const eff = Math.round((result.fidelity / Math.max(1, result.golfTokens)) * 100);
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* headline stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <ScoreRing value={result.fidelity} size={84} stroke={7} label="FIDELITY" />
        <div style={{ display: "flex", gap: 22, flex: 1 }}>
          <StatBlock label="Tokens" value={result.golfTokens} sub="your prompt · golf score" accent="var(--accent)" />
          <StatBlock label="Efficiency" value={eff} sub="fidelity / 100 tok" />
        </div>
      </div>

      {result.summary && (
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--muted)", borderLeft: "2px solid var(--accent)", paddingLeft: 12 }}>
          “{result.summary}”
        </div>
      )}

      {/* rubric */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="kicker" style={{ marginBottom: 4 }}>Rubric · vision judge</div>
        <RubricRow label="Color" value={result.scores.color} />
        <RubricRow label="Typography" value={result.scores.typography} />
        <RubricRow label="Layout" value={result.scores.layout} />
        <RubricRow label="Components" value={result.scores.components} />
      </div>

      {/* pixel diff */}
      {result.pixel && (
        <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 74, borderRadius: 4, overflow: "hidden", border: "1px solid var(--hairline)", flexShrink: 0 }}>
            <img src={result.pixel.heatmapDataUrl} alt="diff" style={{ width: "100%", display: "block" }} />
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: 4 }}>Pixel diff vs gold</div>
            <div className="display" style={{ fontSize: 24 }}>{result.pixel.similarity}<span style={{ fontSize: 14, color: "var(--faint)" }}>% structural</span></div>
            <div className="mono faint" style={{ fontSize: 11, marginTop: 2 }}>red = where you diverge from the reference render</div>
          </div>
        </div>
      )}

      {/* good / wrong */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 8, color: "var(--good)" }}>✓ Matched</div>
          {(result.good.length ? result.good : ["—"]).map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 7, fontSize: 12.5, color: "var(--muted)", padding: "3px 0", lineHeight: 1.4 }}>
              <span style={{ color: "var(--good)", flexShrink: 0 }}><Icon name="check" size={13} /></span>{g}
            </div>
          ))}
        </div>
        <div>
          <div className="kicker" style={{ marginBottom: 8, color: "var(--accent)" }}>✗ Off-spec</div>
          {(result.wrong.length ? result.wrong : ["—"]).map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 7, fontSize: 12.5, color: "var(--muted)", padding: "3px 0", lineHeight: 1.4 }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}><Icon name="x" size={13} /></span>{w}
            </div>
          ))}
        </div>
      </div>

      <div className="mono faint" style={{ fontSize: 11, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span>api in {result.apiInput} tok</span>
        <span>api out {result.apiOutput} tok</span>
        <span>{(result.ms / 1000).toFixed(1)}s</span>
      </div>

      {submitted ? (
        <button className="btn" disabled style={{ justifyContent: "center" }}><Icon name="check" size={15} /> Submitted to leaderboard</button>
      ) : (
        <button className="btn btn-accent btn-lg" onClick={onSubmit} style={{ justifyContent: "center" }}>
          <Icon name="trophy" size={16} /> Submit {result.golfTokens} tok · {Math.round(result.fidelity)}% to leaderboard
        </button>
      )}
    </div>
  );
}

Object.assign(window, { ScorePanel });

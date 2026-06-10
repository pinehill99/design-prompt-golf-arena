/* Leaderboard — per-challenge Pareto frontier, model×effort matrix, ranked table.
   Default sort axis = fewest tokens among qualifying (fidelity >= gate). */

function ParetoChart({ points }) {
  const W = 720, H = 300, PADL = 46, PADB = 38, PADT = 18, PADR = 16;
  const maxTok = Math.max(120, Math.ceil(Math.max(...points.map((p) => p.tokens), 1) / 50) * 50);
  const minFid = 55, maxFid = 100;
  const x = (t) => PADL + (t / maxTok) * (W - PADL - PADR);
  const y = (f) => PADT + (1 - (f - minFid) / (maxFid - minFid)) * (H - PADT - PADB);

  // pareto-optimal: minimize tokens, maximize fidelity (top-left is best)
  const opt = points.filter((p) => !points.some((q) => q !== p && q.tokens <= p.tokens && q.fidelity >= p.fidelity && (q.tokens < p.tokens || q.fidelity > p.fidelity)));
  opt.sort((a, b) => a.tokens - b.tokens);
  const [hover, setHover] = React.useState(null);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* grid */}
        {[55, 65, 75, 85, 95].map((f) => (
          <g key={f}>
            <line x1={PADL} x2={W - PADR} y1={y(f)} y2={y(f)} stroke="var(--hairline)" />
            <text x={PADL - 8} y={y(f) + 3} textAnchor="end" fontSize="9" fill="var(--faint)" fontFamily="var(--mono)">{f}</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <text key={r} x={x(maxTok * r)} y={H - PADB + 16} textAnchor="middle" fontSize="9" fill="var(--faint)" fontFamily="var(--mono)">{Math.round(maxTok * r)}</text>
        ))}
        <text x={(W) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">tokens →  (fewer = better)</text>
        <text x={-H / 2} y={13} transform="rotate(-90)" textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">fidelity ↑</text>

        {/* frontier */}
        {opt.length > 1 && (
          <polyline points={opt.map((p) => x(p.tokens) + "," + y(p.fidelity)).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        )}
        {/* points */}
        {points.map((p, i) => {
          const isOpt = opt.includes(p);
          return (
            <circle key={i} cx={x(p.tokens)} cy={y(p.fidelity)} r={p.you ? 6 : isOpt ? 5 : 3.5}
              fill={p.you ? "var(--ink)" : window.PROVIDER_COLOR[p.provider]}
              stroke={p.you ? "var(--bg)" : isOpt ? "var(--ink)" : "none"} strokeWidth={p.you ? 2 : isOpt ? 1.2 : 0}
              opacity={isOpt || p.you ? 1 : 0.55} style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover({ p, cx: x(p.tokens), cy: y(p.fidelity) })} onMouseLeave={() => setHover(null)} />
          );
        })}
      </svg>
      {hover && (
        <div style={{ position: "absolute", left: `${(hover.cx / W) * 100}%`, top: `${(hover.cy / H) * 100}%`, transform: "translate(-50%, -120%)", background: "var(--ink)", color: "var(--bg)", padding: "6px 9px", borderRadius: 6, fontSize: 11, fontFamily: "var(--mono)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 5 }}>
          @{hover.p.handle} · {hover.p.tokens} tok · {hover.p.fidelity}%
        </div>
      )}
    </div>
  );
}

function Matrix({ rows }) {
  // rows: entries for a challenge. cell = best (min) tokens among fidelity>=90 for provider×effort
  const efforts = ["low", "medium", "high"];
  const provs = window.PROVIDER_LIST.map((p) => p.id);
  const cell = {};
  let best = Infinity;
  rows.forEach((e) => {
    if (e.fidelity < 90) return;
    const k = e.provider + "|" + e.effort;
    if (cell[k] == null || e.tokens < cell[k]) cell[k] = e.tokens;
    if (e.tokens < best) best = e.tokens;
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "var(--mono)", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--faint)", fontWeight: 400, fontSize: 10, letterSpacing: ".08em" }}>PROVIDER</th>
            {efforts.map((e) => <th key={e} style={{ padding: "8px 10px", color: "var(--faint)", fontWeight: 400, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>{e}</th>)}
          </tr>
        </thead>
        <tbody>
          {provs.map((pid) => {
            const prov = window.PROVIDERS[pid];
            return (
              <tr key={pid} style={{ borderTop: "1px solid var(--hairline)" }}>
                <td style={{ padding: "9px 10px", display: "flex", alignItems: "center", gap: 7 }}><ProviderDot provider={pid} /> {prov.label}</td>
                {efforts.map((e) => {
                  const v = cell[pid + "|" + e];
                  const isBest = v != null && v === best;
                  return (
                    <td key={e} style={{ padding: "9px 10px", textAlign: "center", color: v == null ? "var(--faint)" : "var(--ink)", background: isBest ? "var(--accent-soft)" : "transparent", fontWeight: isBest ? 700 : 400, position: "relative" }}>
                      {v == null ? "·" : v}
                      {isBest && <span style={{ position: "absolute", top: 2, right: 4, fontSize: 8, color: "var(--accent)" }}>★</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Leaderboard({ challenges, board, onOpen }) {
  const featured = challenges.filter((c) => c.featured).map((c) => c.slug);
  const [slug, setSlug] = React.useState(featured[0] || challenges[0].slug);
  const [gate, setGate] = React.useState(90);
  const ch = challenges.find((c) => c.slug === slug);
  const rows = board.filter((e) => e.challenge === slug);
  const qualified = rows.filter((e) => e.fidelity >= gate).sort((a, b) => a.tokens - b.tokens);
  const points = rows.map((e) => ({ tokens: e.tokens, fidelity: e.fidelity, provider: e.provider, handle: e.handle, you: e.you }));

  return (
    <div className="shell" style={{ padding: "34px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 10 }}>Leaderboard · sorted by fewest tokens</div>
          <h1 className="display" style={{ fontSize: 40, margin: 0 }}>Who said it shortest?</h1>
          <p className="muted" style={{ fontSize: 15, marginTop: 10, maxWidth: 540, lineHeight: 1.5 }}>
            Every qualifying run plotted by tokens vs. fidelity. The dashed line is the Pareto frontier — nobody beats those on both axes at once.
          </p>
        </div>
        <select className="field" style={{ width: 220 }} value={slug} onChange={(e) => setSlug(e.target.value)}>
          {challenges.map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.featured ? "  ★" : ""}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start", marginBottom: 18 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="kicker">Pareto frontier · {ch.name}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {window.PROVIDER_LIST.map((p) => (
                <span key={p.id} className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><ProviderDot provider={p.id} size={7} />{p.label}</span>
              ))}
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink)" }} />you</span>
            </div>
          </div>
          <ParetoChart points={points} />
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="kicker" style={{ marginBottom: 12 }}>Best tokens · model × reasoning</div>
          <Matrix rows={rows} />
          <div className="mono faint" style={{ fontSize: 10.5, marginTop: 12, lineHeight: 1.5 }}>Lowest qualifying prompt (fidelity ≥ 90) per cell. ★ = challenge record.</div>
        </div>
      </div>

      {/* ranked table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--hairline)" }}>
          <div className="kicker">Ranking · {qualified.length} qualifying runs</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mono faint" style={{ fontSize: 11 }}>fidelity gate</span>
            <div className="seg">{[80, 90, 95].map((g) => <button key={g} className={gate === g ? "on" : ""} onClick={() => setGate(g)}>{g}</button>)}</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr className="mono" style={{ color: "var(--faint)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>
                {["#", "Player", "Model", "Effort", "Tokens", "Fidelity", "When"].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 4 && i <= 5 ? "right" : "left", padding: "10px 16px", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qualified.map((e, i) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--hairline)", background: e.you ? "var(--accent-soft)" : "transparent" }}>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--mono)", color: i < 3 ? "var(--accent)" : "var(--faint)", fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</td>
                  <td style={{ padding: "11px 16px", fontWeight: 500 }}>{e.you ? "You" : "@" + e.handle}</td>
                  <td style={{ padding: "11px 16px" }}><span style={{ display: "flex", alignItems: "center", gap: 7 }}><ProviderDot provider={e.provider} /> <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.model}</span></span></td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>{e.effort}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700 }}>{e.tokens}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--mono)", color: e.fidelity >= 95 ? "var(--good)" : "var(--ink)" }}>{e.fidelity}%</td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{window.Store.fmtAgo(e.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {qualified.length === 0 && <div className="empty">No runs clear the {gate}% gate yet. <a onClick={() => onOpen(ch)} style={{ color: "var(--accent)", cursor: "pointer" }}>Be the first →</a></div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Leaderboard });

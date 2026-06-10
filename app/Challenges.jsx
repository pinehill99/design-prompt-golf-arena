/* Challenge gallery — 56 targets from awesome-design-md. */

function ChallengeThumb({ ch, h = 132 }) {
  const dark = ch.theme === "dark";
  const bg = dark ? "#0d0d10" : "#ffffff";
  const ink = dark ? "#f2f2f2" : "#1a1a1a";
  const line = dark ? "#262629" : "#e9e9ec";
  return (
    <div style={{ height: h, background: bg, borderRadius: "calc(var(--r) - 1px)", overflow: "hidden", position: "relative", border: "1px solid " + line }}>
      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", borderBottom: "1px solid " + line }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: ch.accent }} />
        <span style={{ width: 26, height: 4, borderRadius: 2, background: ink, opacity: .8 }} />
        <span style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 3, borderRadius: 2, background: ink, opacity: .25 }} />)}
        </span>
      </div>
      {/* hero */}
      <div style={{ padding: "16px 12px" }}>
        <span style={{ display: "inline-block", fontFamily: "var(--mono)", fontSize: 6.5, letterSpacing: ".1em", color: ch.accent, marginBottom: 8, textTransform: "uppercase" }}>{ch.category}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ width: "82%", height: 9, borderRadius: 3, background: ink }} />
          <span style={{ width: "60%", height: 9, borderRadius: 3, background: ink, opacity: .85 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 9 }}>
          <span style={{ width: "70%", height: 3, borderRadius: 2, background: ink, opacity: .25 }} />
          <span style={{ width: "52%", height: 3, borderRadius: 2, background: ink, opacity: .25 }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <span style={{ width: 42, height: 13, borderRadius: 999, background: ch.accent }} />
          <span style={{ width: 34, height: 13, borderRadius: 999, border: "1px solid " + (dark ? "#3a3a3d" : "#d8d8db") }} />
        </div>
      </div>
    </div>
  );
}

function ChallengeCard({ ch, best, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={() => onOpen(ch)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="card" style={{ textAlign: "left", cursor: "pointer", padding: 12, background: "var(--surface)", transition: ".18s var(--ease)", transform: hover ? "translateY(-3px)" : "none", boxShadow: hover ? "0 14px 32px rgba(0,0,0,.10)" : "none", borderColor: hover ? "var(--ink)" : "var(--hairline)", display: "flex", flexDirection: "column", gap: 12 }}>
      <ChallengeThumb ch={ch} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "0 2px 2px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="display" style={{ fontSize: 17 }}>{ch.name}</span>
            {ch.featured && <span className="chip" style={{ padding: "2px 7px", fontSize: 9.5, color: "var(--accent)", borderColor: "var(--accent)" }}>REF</span>}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 3, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{ch.tagline}</div>
        </div>
        <span className={"tag-diff diff-" + ch.difficulty}>{ch.difficulty}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--hairline)", paddingTop: 10, marginTop: "auto" }}>
        <span className="chip"><span className="swatch" style={{ background: ch.accent }} />{ch.category}</span>
        <span className="mono" style={{ fontSize: 11, color: best ? "var(--good)" : "var(--faint)" }}>
          {best ? "▸ " + best + " tok best" : "no entries"}
        </span>
      </div>
    </button>
  );
}

function Challenges({ challenges, board, onOpen }) {
  const [cat, setCat] = React.useState("All");
  const [q, setQ] = React.useState("");
  const bestByCh = React.useMemo(() => {
    const m = {};
    board.forEach((e) => {
      if (e.fidelity >= 90) { if (m[e.challenge] == null || e.tokens < m[e.challenge]) m[e.challenge] = e.tokens; }
    });
    return m;
  }, [board]);

  const list = challenges.filter((c) =>
    (cat === "All" || c.category === cat) &&
    (!q || (c.name + " " + c.tagline + " " + c.category).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="shell" style={{ padding: "34px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 10 }}>Challenge library · awesome-design-md</div>
          <h1 className="display" style={{ fontSize: 40, margin: 0 }}>Pick a target to recreate.</h1>
          <p className="muted" style={{ fontSize: 15, marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>
            {challenges.length} design systems, each with a DESIGN.md spec. Match the look in the fewest tokens you can. <span style={{ color: "var(--accent)" }}>REF</span> targets are scored with a pixel-diff against a gold render.
          </p>
        </div>
        <div style={{ position: "relative", width: 240 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}><Icon name="search" size={15} /></span>
          <input className="field" placeholder="Search targets…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {window.CHALLENGE_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="tab" style={cat === c ? { background: "var(--ink)", color: "var(--bg)" } : {}}>{c}</button>
        ))}
        <span className="mono faint" style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}>{list.length} shown</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))", gap: 16 }}>
        {list.map((ch) => <ChallengeCard key={ch.slug} ch={ch} best={bestByCh[ch.slug]} onOpen={onOpen} />)}
      </div>
      {list.length === 0 && <div className="empty">No targets match “{q}”.</div>}
    </div>
  );
}

Object.assign(window, { Challenges, ChallengeThumb });

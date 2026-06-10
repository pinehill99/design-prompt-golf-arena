/* Shared UI atoms. Exported to window for the screen scripts. */

const ICONS = {
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-left": "M19 12H5M11 6l-6 6 6 6",
  check: "M4 12l5 5L20 6",
  x: "M6 6l12 12M18 6L6 18",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  external: "M14 5h5v5M19 5l-8 8M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 0-3 3M9 19h6M12 14v5",
  sliders: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5M14 4v4M6 10v4M11 16v4",
  refresh: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  play: "M6 4l14 8-14 8z",
  lock: "M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5z",
  chevron: "M9 6l6 6-6 6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  github: "M9 19c-4 1.4-4-1.7-5.6-2.1M18 21v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C3.6 1.6 2.5 1.9 2.5 1.9a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 1 8.3c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V21",
};

function Icon({ name, size = 16, stroke = 2, fill = false, style }) {
  const d = ICONS[name] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"} strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      <path d={d} />
    </svg>
  );
}

const PROVIDER_COLOR = { anthropic: "#D97757", openai: "#10A37F", codex: "#171717", google: "#4285F4", mistral: "#FA520F" };

function ProviderDot({ provider, size = 8 }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: PROVIDER_COLOR[provider] || "#999", display: "inline-block", flexShrink: 0 }} />;
}

function ScoreRing({ value = 0, size = 64, stroke = 6, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const col = value >= 90 ? "var(--good)" : value >= 75 ? "var(--accent)" : value >= 60 ? "var(--warn)" : "var(--faint)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s var(--ease)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", lineHeight: 1 }}>
        <div>
          <div className="display" style={{ fontSize: size * 0.3, fontWeight: 600 }}>{Math.round(value)}</div>
          {label && <div className="mono" style={{ fontSize: 8, color: "var(--faint)", letterSpacing: ".08em", marginTop: 2 }}>{label}</div>}
        </div>
      </div>
    </div>
  );
}

function Bar({ value = 0, color = "var(--accent)", h = 6 }) {
  return (
    <div style={{ background: "var(--hairline)", borderRadius: 999, height: h, overflow: "hidden", width: "100%" }}>
      <div style={{ width: Math.max(0, Math.min(100, value)) + "%", height: "100%", background: color, borderRadius: 999, transition: "width .7s var(--ease)" }} />
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "color-mix(in srgb, var(--ink) 36%, transparent)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} className="card fade-up" style={{ width, maxWidth: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 70px rgba(0,0,0,.22)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--hairline)", position: "sticky", top: 0, background: "var(--surface)" }}>
          <div className="display" style={{ fontSize: 19 }}>{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ borderColor: "transparent", padding: 6 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fade-up" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "var(--ink)", color: "var(--bg)", padding: "11px 18px", borderRadius: 999, fontSize: 13.5, fontFamily: "var(--mono)", boxShadow: "0 10px 30px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 9 }}>
      {toast.icon && <Icon name={toast.icon} size={15} />} {toast.msg}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = React.useState(null);
  const show = React.useCallback((msg, icon) => {
    setToast({ msg, icon });
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => setToast(null), 2600);
  }, []);
  return [toast, show];
}

Object.assign(window, { Icon, ICONS, ProviderDot, PROVIDER_COLOR, ScoreRing, Bar, Modal, Toast, useToast });

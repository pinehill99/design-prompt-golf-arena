/* Tweaks panel — explore the 3 editorial visual directions + a couple of refinements. */
function PGTweaks() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "standard",
    "accent": "#2D5BFF",
    "radius": "soft",
    "density": "regular"
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // drive the live theme
  React.useEffect(() => { if (window.__setTheme) window.__setTheme(t.theme); }, [t.theme]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    // derive a soft accent tint
    root.style.setProperty("--accent-soft", t.accent + "22");
  }, [t.accent]);

  React.useEffect(() => {
    const map = { sharp: "2px", soft: "9px", round: "16px" };
    document.documentElement.style.setProperty("--r", map[t.radius] || "9px");
  }, [t.radius]);

  React.useEffect(() => {
    const map = { compact: "1140px", regular: "1280px", wide: "1440px" };
    document.documentElement.style.setProperty("--maxw", map[t.density] || "1280px");
  }, [t.density]);

  const accentsFor = {
    press: ["#B0492F", "#7A5A2E", "#3F6B45", "#8A4A6B"],
    standard: ["#2D5BFF", "#1F8A5B", "#7A4FD0", "#E8341C"],
    ink: ["#E8341C", "#0A0A0A", "#1B4DE8", "#1F8A5B"],
  };

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Visual direction" />
      <TweakRadio label="Theme" value={t.theme} options={["press", "standard", "ink"]}
        onChange={(v) => { setTweak("theme", v); setTweak("accent", accentsFor[v][0]); }} />
      <div style={{ font: "10px/1.4 ui-monospace, monospace", color: "#8a857a", padding: "0 14px 8px" }}>
        {t.theme === "press" ? "Warm paper · Newsreader serif" : t.theme === "standard" ? "Cool white · Space Grotesk" : "Off-white · Archivo brutalist"}
      </div>
      <TweakColor label="Accent" value={t.accent} options={accentsFor[t.theme] || accentsFor.press}
        onChange={(v) => setTweak("accent", v)} />
      <TweakSection label="Form" />
      <TweakRadio label="Corner radius" value={t.radius} options={["sharp", "soft", "round"]}
        onChange={(v) => setTweak("radius", v)} />
      <TweakRadio label="Content width" value={t.density} options={["compact", "regular", "wide"]}
        onChange={(v) => setTweak("density", v)} />
    </TweaksPanel>
  );
}

// mount the tweaks panel into its own root so it overlays the app
(function () {
  const el = document.createElement("div");
  document.body.appendChild(el);
  ReactDOM.createRoot(el).render(<PGTweaks />);
})();

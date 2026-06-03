/* Persistence + mock leaderboard seed. Keys & submissions live in localStorage. */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  function usePersistentState(key, dflt) {
    const [v, setV] = React.useState(() => LS.get(key, dflt));
    React.useEffect(() => { LS.set(key, v); }, [key, v]);
    return [v, setV];
  }

  // deterministic pseudo-random so the seeded board is stable across reloads
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const HANDLES = ["minju.dev","toknman","kenshō","arc_lee","golfer42","pixelpusher","haewon","oneshot","leesg","mチ","devkim","sora_h","bytewright","quietcoder","jpark","emi.kang","route9","nullbyte","sunwoo","glyph","r0man","mira-ux","tinyprompt","hojin"];
  const COMBOS = [
    { provider: "anthropic", model: "claude-sonnet-4-5", efforts: ["low","medium","high"] },
    { provider: "anthropic", model: "claude-opus-4-1", efforts: ["medium","high"] },
    { provider: "openai", model: "gpt-5", efforts: ["low","medium","high"] },
    { provider: "openai", model: "o4-mini", efforts: ["medium","high"] },
    { provider: "google", model: "gemini-2.5-pro", efforts: ["low","high"] },
    { provider: "mistral", model: "mistral-large-latest", efforts: ["low"] },
  ];

  function seedLeaderboard(challenges) {
    const out = [];
    let uid = 1000;
    challenges.forEach((ch, ci) => {
      const rnd = mulberry32(1337 + ci * 7);
      const count = 4 + Math.floor(rnd() * 7); // 4-10 entries per challenge
      for (let i = 0; i < count; i++) {
        const combo = COMBOS[Math.floor(rnd() * COMBOS.length)];
        const effort = combo.efforts[Math.floor(rnd() * combo.efforts.length)];
        // higher effort -> usually higher fidelity, smaller prompts trend lower fidelity
        const baseFid = 78 + rnd() * 20 + (effort === "high" ? 4 : effort === "low" ? -5 : 0);
        const fidelity = Math.max(58, Math.min(99, Math.round(baseFid - (ch.difficulty === "Hard" ? 6 : ch.difficulty === "Easy" ? 2 : 0))));
        // tokens: golfers push low; correlated with effort inversely-ish
        const tokens = Math.round(18 + rnd() * 220 + (fidelity > 92 ? rnd() * 90 : 0));
        out.push({
          id: "seed-" + (uid++),
          challenge: ch.slug,
          handle: HANDLES[Math.floor(rnd() * HANDLES.length)],
          provider: combo.provider, model: combo.model, effort,
          tokens, fidelity,
          turns: rnd() < 0.8 ? 1 : 2,
          ts: Date.now() - Math.floor(rnd() * 1000 * 60 * 60 * 24 * 30),
          seed: true,
        });
      }
    });
    return out;
  }

  function fmtAgo(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  window.Store = { LS, usePersistentState, seedLeaderboard, fmtAgo };
})();

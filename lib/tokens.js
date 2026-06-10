/* Token estimation. Real tokenizers need per-model BPE tables we can't bundle in a
   static prototype, so this is a calibrated heuristic (~within 10-15% of GPT/Claude
   tokenizers for English+code). Clearly labelled as an estimate in the UI. */
(function () {
  function estimateTokens(text) {
    if (!text) return 0;
    text = String(text);
    // blend two signals: chars/4 and word-based, then nudge for code punctuation
    const chars = text.length;
    const words = (text.trim().match(/\s+/g) || []).length + (text.trim() ? 1 : 0);
    const byChars = chars / 4;
    const byWords = words * 1.33;
    let est = byChars * 0.6 + byWords * 0.4;
    // punctuation / symbols tend to split into their own tokens
    const symbols = (text.match(/[{}()<>[\]/\\|#$%^&*+=~`]/g) || []).length;
    est += symbols * 0.25;
    return Math.max(1, Math.round(est));
  }
  window.estimateTokens = estimateTokens;
})();

/* Scoring: capture the rendered output, run a pixel-diff heatmap against a gold
   reference (featured challenges), and run a vision-LLM rubric judge against the
   DESIGN.md spec (all challenges). Uses html2canvas (loaded in index.html). */
(function () {
  // ---- capture an iframe's rendered document to a canvas at a fixed width ----
  async function captureIframe(iframe, targetW) {
    targetW = targetW || 1000;
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) throw new Error("render not ready");
    const body = doc.documentElement;
    const canvas = await window.html2canvas(body, {
      backgroundColor: getComputedStyle(doc.body).backgroundColor || "#ffffff",
      width: doc.documentElement.scrollWidth,
      windowWidth: doc.documentElement.scrollWidth,
      scale: 1,
      useCORS: true,
      logging: false,
    });
    // normalize width
    const ratio = targetW / canvas.width;
    const out = document.createElement("canvas");
    out.width = targetW;
    out.height = Math.max(1, Math.round(canvas.height * ratio));
    const ctx = out.getContext("2d");
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  function canvasToDataUrl(canvas, maxW) {
    maxW = maxW || 900;
    if (canvas.width <= maxW) return canvas.toDataURL("image/png");
    const r = maxW / canvas.width;
    const c2 = document.createElement("canvas");
    c2.width = maxW; c2.height = Math.round(canvas.height * r);
    c2.getContext("2d").drawImage(canvas, 0, 0, c2.width, c2.height);
    return c2.toDataURL("image/png");
  }

  // ---- pixel diff -> { similarity, heatmapDataUrl } ----
  function pixelDiff(candCanvas, refCanvas) {
    const W = 360;
    const H = Math.round(Math.min(900, Math.max(candCanvas.height, refCanvas.height) * (W / Math.max(candCanvas.width, refCanvas.width))));
    function norm(src) {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
      x.drawImage(src, 0, 0, W, H);
      return x.getImageData(0, 0, W, H);
    }
    const a = norm(candCanvas), b = norm(refCanvas);
    const heat = document.createElement("canvas");
    heat.width = W; heat.height = H;
    const hx = heat.getContext("2d");
    const out = hx.createImageData(W, H);
    let totalDiff = 0;
    const n = a.data.length / 4;
    for (let i = 0; i < a.data.length; i += 4) {
      const dr = Math.abs(a.data[i] - b.data[i]);
      const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
      const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
      const d = (dr + dg + db) / 3 / 255; // 0..1
      totalDiff += d;
      // base: faded candidate; overlay red where different
      const g = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3;
      const base = 200 + g * 0.2;
      const heatAmt = Math.min(1, d * 1.8);
      out.data[i] = base * (1 - heatAmt) + 230 * heatAmt;
      out.data[i + 1] = base * (1 - heatAmt) + 70 * heatAmt;
      out.data[i + 2] = base * (1 - heatAmt) + 60 * heatAmt;
      out.data[i + 3] = 255;
    }
    hx.putImageData(out, 0, 0);
    const mean = totalDiff / n;
    // map mean diff -> similarity %. small diffs dominate, so use a gentle curve
    const similarity = Math.max(0, Math.min(100, Math.round((1 - Math.pow(mean, 0.7) * 1.25) * 100)));
    return { similarity, heatmapDataUrl: heat.toDataURL("image/png") };
  }

  // ---- vision rubric judge ----
  const JUDGE_SYSTEM =
    "You are a strict but fair design-fidelity judge for a 'prompt golf' game. " +
    "You are shown a SCREENSHOT of a webpage a contestant generated, and the TARGET DESIGN SPEC it was supposed to match. " +
    "Score how faithfully the screenshot realizes the spec. Be specific and concrete. " +
    "Reply with ONLY a JSON object, no prose, no code fences, of the exact shape: " +
    '{"fidelity":0-100,"scores":{"color":0-100,"typography":0-100,"layout":0-100,"components":0-100},' +
    '"wrong":["short concrete miss","..."],"good":["short concrete hit"],"summary":"one sentence"}. ' +
    "fidelity is the holistic overall match. Keep each wrong/good item under 12 words; max 5 items each.";

  function buildJudgePrompt(challenge) {
    const s = challenge.spec;
    return (
      "TARGET: " + challenge.name + " — " + challenge.tagline + "\n\n" +
      "DESIGN SPEC (DESIGN.md):\n" +
      "Overview: " + s.overview + "\n" +
      "Palette: " + (s.palette || []).join(" | ") + "\n" +
      "Type: display=" + s.type.display + "; body=" + s.type.body + "\n" +
      "Layout: " + s.layout + "\n" +
      "Components: " + s.components + "\n" +
      "Motion: " + s.motion + "\n\n" +
      "Judge the attached screenshot against this spec. Return the JSON object only."
    );
  }

  async function judge({ provider, key, keys, challenge, imageDataUrl, model, signal }) {
    const res = await provider.judge({
      key, keys, system: JUDGE_SYSTEM, prompt: buildJudgePrompt(challenge),
      imageDataUrl, model, signal,
    });
    let j = res.json;
    if (!j || typeof j.fidelity !== "number") {
      // fallback minimal parse
      j = { fidelity: 50, scores: { color: 50, typography: 50, layout: 50, components: 50 }, wrong: ["Judge returned unstructured output."], good: [], summary: res.text ? res.text.slice(0, 120) : "No structured score." };
    }
    j.scores = j.scores || {};
    ["color", "typography", "layout", "components"].forEach((k) => {
      if (typeof j.scores[k] !== "number") j.scores[k] = j.fidelity || 50;
    });
    j.wrong = Array.isArray(j.wrong) ? j.wrong.slice(0, 5) : [];
    j.good = Array.isArray(j.good) ? j.good.slice(0, 5) : [];
    return j;
  }

  window.Scoring = { captureIframe, canvasToDataUrl, pixelDiff, judge, buildJudgePrompt };
})();

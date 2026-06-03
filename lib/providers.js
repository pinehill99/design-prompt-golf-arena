/* Real BYOK provider adapters. Calls go browser -> provider directly or through
   a user-provided proxy. Keys/tokens live only in localStorage on this device.
   Each adapter exposes:
     complete({ key, keys, system, prompt, model, effort, signal }) -> { text, usage:{input,output}, ms }
     judge({ key, keys, system, prompt, imageDataUrl, model, signal }) -> { text }
   `text` from complete() is cleaned of markdown code fences so it can render directly. */
(function () {
  function stripFences(s) {
    if (!s) return "";
    let t = s.trim();
    // pull the first ```html ... ``` block if present, else strip stray fences
    const m = t.match(/```(?:html|HTML)?\s*([\s\S]*?)```/);
    if (m) t = m[1].trim();
    t = t.replace(/^```(?:html)?/i, "").replace(/```$/,"").trim();
    return t;
  }

  function parseJsonLoose(s) {
    if (!s) return null;
    const m = s.match(/\{[\s\S]*\}/);
    try { return JSON.parse(m ? m[0] : s); } catch (e) { return null; }
  }

  async function asJson(res) {
    const txt = await res.text();
    let data; try { data = JSON.parse(txt); } catch (e) { data = null; }
    if (!res.ok) {
      const msg = (data && (data.error?.message || data.error?.type || data.message)) || txt.slice(0, 300) || ("HTTP " + res.status);
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return data;
  }

  const dataUrlParts = (u) => {
    const m = String(u).match(/^data:([^;]+);base64,(.*)$/);
    return m ? { mime: m[1], b64: m[2] } : { mime: "image/png", b64: "" };
  };

  const openAIReasoningModels = /^(o\d|gpt-5)/;

  function openAIChatBody({ system, prompt, model, effort, maxTokens }) {
    const body = {
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      max_completion_tokens: maxTokens || 8000,
    };
    if (openAIReasoningModels.test(model)) body.reasoning_effort = effort;
    else body.temperature = 0.5;
    return body;
  }

  function openAIVisionBody({ system, prompt, imageDataUrl, model }) {
    return {
      model,
      max_completion_tokens: 1500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ] },
      ],
    };
  }

  /* ---------------- Anthropic ---------------- */
  const anthropic = {
    id: "anthropic", label: "Anthropic", keyHint: "sk-ant-…",
    docs: "console.anthropic.com",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5"],
    visionModel: "claude-sonnet-4-5",
    supportsEffort: true,
    async _call(key, body, signal) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(body),
      });
      return asJson(res);
    },
    async complete({ key, system, prompt, model, effort, signal }) {
      const t0 = performance.now();
      const budget = { low: 0, medium: 4000, high: 12000 }[effort] ?? 0;
      const body = {
        model: model || this.models[0],
        max_tokens: budget ? budget + 8000 : 8000,
        system,
        messages: [{ role: "user", content: prompt }],
      };
      if (budget) body.thinking = { type: "enabled", budget_tokens: budget };
      const data = await this._call(key, body, signal);
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      return {
        text: stripFences(text),
        usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
        ms: performance.now() - t0,
      };
    },
    async judge({ key, system, prompt, imageDataUrl, model, signal }) {
      const { mime, b64 } = dataUrlParts(imageDataUrl);
      const body = {
        model: model || this.visionModel, max_tokens: 1500, system,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: prompt },
        ] }],
      };
      const data = await this._call(key, body, signal);
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      return { text, json: parseJsonLoose(text) };
    },
  };

  /* ---------------- OpenAI ---------------- */
  const openai = {
    id: "openai", label: "OpenAI", keyHint: "sk-…", docs: "platform.openai.com",
    models: ["gpt-5", "gpt-5-mini", "o4-mini", "gpt-4.1"],
    visionModel: "gpt-4.1",
    supportsEffort: true,
    isConfigured: (keys) => !!keys.openai,
    async _call(key, body, signal) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", signal,
        headers: { "content-type": "application/json", "authorization": "Bearer " + key },
        body: JSON.stringify(body),
      });
      return asJson(res);
    },
    async complete({ key, system, prompt, model, effort, signal }) {
      const t0 = performance.now();
      const mdl = model || this.models[0];
      const body = openAIChatBody({ system, prompt, model: mdl, effort });
      const data = await this._call(key, body, signal);
      const text = data.choices?.[0]?.message?.content || "";
      return {
        text: stripFences(text),
        usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
        ms: performance.now() - t0,
      };
    },
    async judge({ key, system, prompt, imageDataUrl, model, signal }) {
      const body = openAIVisionBody({ system, prompt, imageDataUrl, model: model || this.visionModel });
      const data = await this._call(key, body, signal);
      const text = data.choices?.[0]?.message?.content || "";
      return { text, json: parseJsonLoose(text) };
    },
  };

  /* ---------------- OpenAI Codex OAuth via proxy ----------------
     OpenAI docs treat Codex account OAuth/access-token auth as an advanced,
     trusted automation flow. This static app therefore never sends a Codex token
     directly to api.openai.com; it sends the token only to the proxy URL the user
     controls. The proxy is expected to accept OpenAI chat-completions-compatible
     JSON and return the same response shape. */
  const codex = {
    id: "codex", label: "Codex OAuth", keyHint: "CODEX_ACCESS_TOKEN", docs: "developers.openai.com/codex",
    proxyHint: "https://your-worker.example.com/openai-chat",
    models: openai.models,
    visionModel: openai.visionModel,
    supportsEffort: true,
    isConfigured: (keys) => !!(keys.codex && keys.codexProxy),
    async _call(key, keys, body, signal) {
      const token = String(key || "").trim();
      const proxyUrl = String(keys.codexProxy || "").trim();
      if (!token) throw new Error("Add your Codex access token in Settings.");
      if (!proxyUrl) throw new Error("Add a Codex OAuth proxy URL in Settings.");
      const res = await fetch(proxyUrl, {
        method: "POST", signal,
        headers: {
          "content-type": "application/json",
          "authorization": "Bearer " + token,
          "x-prompt-golf-openai-endpoint": "/v1/chat/completions",
        },
        body: JSON.stringify(body),
      });
      return asJson(res);
    },
    async complete({ key, keys, system, prompt, model, effort, signal }) {
      const t0 = performance.now();
      const mdl = model || this.models[0];
      const data = await this._call(key, keys || {}, openAIChatBody({ system, prompt, model: mdl, effort }), signal);
      const text = data.choices?.[0]?.message?.content || "";
      return {
        text: stripFences(text),
        usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
        ms: performance.now() - t0,
      };
    },
    async judge({ key, keys, system, prompt, imageDataUrl, model, signal }) {
      const body = openAIVisionBody({ system, prompt, imageDataUrl, model: model || this.visionModel });
      const data = await this._call(key, keys || {}, body, signal);
      const text = data.choices?.[0]?.message?.content || "";
      return { text, json: parseJsonLoose(text) };
    },
  };

  /* ---------------- Google Gemini ---------------- */
  const google = {
    id: "google", label: "Google", keyHint: "AIza…", docs: "aistudio.google.com",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
    visionModel: "gemini-2.5-flash",
    supportsEffort: true,
    async _call(key, model, body, signal) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);
      const res = await fetch(url, {
        method: "POST", signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return asJson(res);
    },
    async complete({ key, system, prompt, model, effort, signal }) {
      const t0 = performance.now();
      const mdl = model || this.models[0];
      const budget = { low: 0, medium: 4000, high: 12000 }[effort] ?? 0;
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: budget ? budget + 8000 : 8000, thinkingConfig: { thinkingBudget: budget } },
      };
      const data = await this._call(key, mdl, body, signal);
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || "").join("\n");
      const um = data.usageMetadata || {};
      return {
        text: stripFences(text),
        usage: { input: um.promptTokenCount || 0, output: um.candidatesTokenCount || 0 },
        ms: performance.now() - t0,
      };
    },
    async judge({ key, system, prompt, imageDataUrl, model, signal }) {
      const { mime, b64 } = dataUrlParts(imageDataUrl);
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: mime, data: b64 } },
          { text: prompt },
        ] }],
        generationConfig: { maxOutputTokens: 1500 },
      };
      const data = await this._call(key, model || this.visionModel, body, signal);
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || "").join("\n");
      return { text, json: parseJsonLoose(text) };
    },
  };

  /* ---------------- Mistral ---------------- */
  const mistral = {
    id: "mistral", label: "Mistral", keyHint: "…", docs: "console.mistral.ai",
    models: ["mistral-large-latest", "mistral-medium-latest", "pixtral-large-latest"],
    visionModel: "pixtral-large-latest",
    supportsEffort: false,
    async _call(key, body, signal) {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST", signal,
        headers: { "content-type": "application/json", "authorization": "Bearer " + key },
        body: JSON.stringify(body),
      });
      return asJson(res);
    },
    async complete({ key, system, prompt, model, signal }) {
      const t0 = performance.now();
      const body = {
        model: model || this.models[0],
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        max_tokens: 8000,
      };
      const data = await this._call(key, body, signal);
      const text = data.choices?.[0]?.message?.content || "";
      return {
        text: stripFences(text),
        usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
        ms: performance.now() - t0,
      };
    },
    async judge({ key, system, prompt, imageDataUrl, model, signal }) {
      const body = {
        model: model || this.visionModel, max_tokens: 1500,
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: imageDataUrl },
        ] }],
      };
      const data = await this._call(key, body, signal);
      const text = data.choices?.[0]?.message?.content || "";
      return { text, json: parseJsonLoose(text) };
    },
  };

  const PROVIDERS = { anthropic, openai, codex, google, mistral };
  window.PROVIDERS = PROVIDERS;
  window.PROVIDER_LIST = [anthropic, openai, codex, google, mistral];
  window.EFFORTS = ["low", "medium", "high"];
})();

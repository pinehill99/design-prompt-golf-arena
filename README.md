# Design Prompt Golf Arena

A public prompt-golf prototype for recreating website designs with the fewest possible prompt tokens, turns, and model cost.

This repository now includes the first static web prototype: challenge library, arena, scoring panel, settings, tweak panel, reference renders, and GitHub Pages deployment workflow. The default tweak theme is `standard`.

## Concept

Design Prompt Golf Arena is a prompt-golf system for UI generation:

- Pick a target website design challenge.
- Prompt a model such as Claude or OpenAI from the browser.
- Render the generated HTML/CSS/JS live in a sandbox.
- Compare the result against the target design.
- Publish the prompt, model settings, token usage, visual diff, and score to a GitHub-account leaderboard.

The goal is not only to get close to the target, but to get close with fewer tokens, fewer turns, lower cost, and reproducible settings.

## Initial Challenge Source

The initial benchmark set should include the full public `VoltAgent/awesome-design-md` collection and treat its `design-md/` directory as the canonical challenge registry.

Each challenge should store:

- target name and category
- source `DESIGN.md`
- reference preview URL or captured render
- allowed assets
- viewport list
- scoring configuration

## Scoring Model

The score should combine visual quality and efficiency:

```text
visual similarity: 55%
layout geometry: 15%
color and typography match: 15%
responsive match: 10%
validity, accessibility, and console health: 5%

efficiency penalties:
prompt tokens, output tokens, turns, model cost, and latency
```

Leaderboards should be split by track:

- highest match
- prompt golf
- one-shot submissions
- model and reasoning-effort comparisons
- cost-efficient submissions
- Pareto frontier

## Product Surface

The core UI should be a three-pane workbench:

- challenge browser and rules
- prompt editor with provider/model settings
- live render, target render, visual diff, and score breakdown

Submission pages should expose:

- prompt text
- provider, model, and reasoning settings
- token and cost usage
- rendered output
- diff image
- reproducibility metadata

## MVP Architecture

The first version can be built mostly on free tiers:

- frontend: GitHub Pages with Vite, React, and TypeScript
- auth and database: Supabase with GitHub login
- API proxy: Cloudflare Workers
- queue: Cloudflare Queues or Supabase table queue
- official scoring: asynchronous Playwright worker through GitHub Actions or a browser-rendering worker

User-supplied provider keys should be treated as bring-your-own-key credentials. OpenAI Codex OAuth access tokens are supported only through a user-controlled proxy endpoint, not direct browser-to-OpenAI calls. Official leaderboard submissions should run through a server-side verifier so usage and scoring metadata can be recorded consistently.

### OpenAI Codex OAuth proxy mode

The static prototype includes a `Codex OAuth` provider option. It asks for:

- `CODEX_ACCESS_TOKEN`
- a proxy URL that accepts OpenAI chat-completions-compatible JSON

The browser sends the token only to that proxy with `Authorization: Bearer <token>` and `x-prompt-golf-openai-endpoint: /v1/chat/completions`. The proxy should run in a trusted environment, apply CORS for the app origin, and return an OpenAI-compatible chat completions response.

This follows the OpenAI Codex guidance that Codex account auth is an advanced trusted-automation flow and that API keys remain the recommended option for most automation/API work:

- https://developers.openai.com/codex/cli/reference#codex-login
- https://developers.openai.com/codex/auth/ci-cd-auth

## Anti-Cheating Rules

Official submissions should reject:

- target screenshots embedded as backgrounds
- external network calls during render
- unapproved asset URLs
- scripts that behave differently during scoring
- layout that only works for one viewport when the challenge requires multiple

All official scoring should happen in a sandboxed, server-controlled render environment.

## Status

Static prototype. The next step is to connect real provider calls, official scoring workers, and GitHub-backed submissions.

## Run Locally

```bash
pnpm install
pnpm dev
```

Build the GitHub Pages artifact:

```bash
pnpm build
```

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const entries = [
  "index.html",
  "styles.css",
  "tweaks-panel.jsx",
  "app",
  "data",
  "lib",
  "references",
  "screenshots",
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const entry of entries) {
  cpSync(resolve(root, entry), resolve(dist, entry), { recursive: true });
}

writeFileSync(resolve(dist, ".nojekyll"), "");

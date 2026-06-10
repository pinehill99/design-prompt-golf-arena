import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const work = resolve(root, ".pages-work");
const remote = execSync("git remote get-url origin", { cwd: root, encoding: "utf8" }).trim();

execSync("node scripts/build-static.mjs", { stdio: "inherit", cwd: root });

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
cpSync(dist, work, { recursive: true });

execSync("git init", { cwd: work, stdio: "inherit" });
execSync(`git remote add origin ${remote}`, { cwd: work, stdio: "inherit" });
execSync("git checkout -b gh-pages", { cwd: work, stdio: "inherit" });
execSync("git add -A", { cwd: work, stdio: "inherit" });
execSync('git commit -m "Deploy GitHub Pages"', { cwd: work, stdio: "inherit" });
execSync("git push -f origin gh-pages", { cwd: work, stdio: "inherit" });

console.log("Deployed to gh-pages branch.");

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = join(root, "dist");
const target = join(root, "frontend", "public", "actual-app");

if (!existsSync(join(source, "index.html"))) {
  throw new Error("Build the Expo web app into dist before syncing the actual-app preview.");
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log("Synced current Expo build to frontend/public/actual-app.");


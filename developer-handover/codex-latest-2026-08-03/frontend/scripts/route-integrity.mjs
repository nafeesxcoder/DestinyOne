import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const pagesRoot = fileURLToPath(new URL("../src/pages/", import.meta.url));

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

function pageRoute(path) {
  let route = `/${relative(pagesRoot, path).split(sep).join("/").replace(/\.jsx$/, "")}`;
  route = route.replace(/\/index$/, "/");
  return route === "/index.actual" || route === "/_app" ? null : route;
}

const routes = files(pagesRoot).filter((path) => extname(path) === ".jsx").map(pageRoute).filter(Boolean);
const patterns = routes.map((route) => new RegExp(`^${route.replace(/\[([^\]]+)\]/g, "[^/]+").replace(/\/$/, "")}/?$`));
const hrefs = new Set();

for (const path of files(root).filter((item) => [".js", ".jsx"].includes(extname(item)))) {
  const source = readFileSync(path, "utf8");
  for (const match of source.matchAll(/href\s*(?:=|:)\s*["']([^"']+)["']/g)) hrefs.add(match[1]);
}

const internal = [...hrefs].filter((href) => href.startsWith("/") && !href.startsWith("//")).map((href) => href.split(/[?#]/)[0] || "/");
const missing = internal.filter((href) => !patterns.some((pattern) => pattern.test(href)));
if (missing.length) {
  console.error(`Missing Next.js routes:\n${[...new Set(missing)].sort().map((route) => `- ${route}`).join("\n")}`);
  process.exit(1);
}

console.log(JSON.stringify({ pages: routes.length, checkedInternalLinks: internal.length, status: "ok" }, null, 2));

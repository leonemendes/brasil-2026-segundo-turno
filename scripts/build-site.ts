import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";

const REPO = "https://github.com/leonemendes/brasil-2026-segundo-turno";
const DATASETS = ["national", "states", "municipalities", "abroad", "close_curves", "late_sections", "timeline", "extension", "urna_log_examples", "vote_sources", "r1_candidates", "map_municipalities", "map_states", "map_world"];
const TABLES = ["national", "states", "municipalities", "abroad", "close_curves", "late_sections", "timeline", "extension", "vote_sources", "r1_candidates"];
const OUT = process.argv[2] ?? "public";

mkdirSync(`${OUT}/data`, { recursive: true });
for (const id of DATASETS) copyFileSync(`ds/${id}.json`, `${OUT}/data/${id}.json`);

const csvCell = (v: unknown) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
for (const id of TABLES) {
  const rows: Record<string, unknown>[] = JSON.parse(readFileSync(`ds/${id}.json`, "utf8"));
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  writeFileSync(`${OUT}/data/${id}.csv`, [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n");
}

const page = readFileSync("ds/index.html", "utf8");
const shim = readFileSync("site-src/dash-shim.js", "utf8");
const links = TABLES.map((id) => `<li><span>${id}</span> <a href="data/${id}.csv" download>CSV</a> <a href="data/${id}.json" download>JSON</a></li>`).join("");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brasil 2026: segundo turno</title>
<meta name="description" content="Who won where in Brazil's 2026 presidential runoff, compared with round 1, 2022 and 2018, and what the 17:00 to 19:00 voting extension changed. Built from official TSE data.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap">
<style>
:root {
  --font-anthropic-sans: "Source Sans 3", "Helvetica Neue", Arial, sans-serif; --font-anthropic-serif: "Source Serif 4", Georgia, serif;
  --color-bg: #f7f7f5; --color-panel: #ffffff; --color-fg: #16181a; --color-fg-muted: #5c6166; --color-border-line: #e1e3e0; --color-warn: #a86a00;
  --cds-gap-xs: 4px; --cds-gap-sm: 8px; --cds-gap-md: 16px; --cds-gap-lg: 24px; --cds-gap-xl: 40px;
  --cds-pad-xs: 4px; --cds-pad-sm: 8px; --cds-pad-md: 12px; --cds-pad-lg: 18px;
  --cds-radius: 8px; --cds-font-size-caption: 0.8rem; --cds-font-size-body: 0.95rem; --cds-font-size-heading: 1.15rem; --cds-font-size-title: 1.9rem; --cds-font-weight-medium: 600;
  --cds-chart-grid: #ecedea; --cds-chart-axis: #b9bdb8; --cds-chart-reference: #9aa09b; --cds-chart-muted: #a9aeaa;
  --cds-surface-popover: #ffffff; --cds-border: #dfe1de; --cds-shadow-popover: 0 8px 24px rgba(0,0,0,.12); --cds-text-secondary: #5c6166; --cds-dur-slow: 240ms;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) { :root {
  --color-bg: #0f1112; --color-panel: #181b1c; --color-fg: #eef0ee; --color-fg-muted: #9aa19c; --color-border-line: #2a2f2d; --color-warn: #eda100;
  --cds-chart-grid: #262b29; --cds-chart-axis: #444b47; --cds-chart-reference: #6c736e; --cds-chart-muted: #59605b;
  --cds-surface-popover: #1f2324; --cds-border: #333937; --cds-shadow-popover: 0 8px 24px rgba(0,0,0,.5); --cds-text-secondary: #9aa19c;
  color-scheme: dark;
} }
[hidden] { display: none !important }
html, body { margin: 0; background: var(--color-bg); color: var(--color-fg); font-family: var(--font-anthropic-sans) }
#dash-root { max-width: 1400px; margin: 0 auto; padding: 24px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px)) }
.site-foot { max-width: 1400px; margin: 0 auto; padding: 24px max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px)); border-top: 1px solid var(--color-border-line); font-size: 0.85rem; color: var(--color-fg-muted); display: grid; gap: 10px }
.site-foot ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 18px }
.site-foot a { color: var(--color-fg) }
.site-foot li span { font-family: ui-monospace, Menlo, monospace; font-size: 0.8rem }
</style>
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script>window.DASH_DATASETS = ${JSON.stringify(DATASETS)};</script>
<script>${shim}</script>
</head>
<body>
<div id="dash-root">
${page}
</div>
<footer class="site-foot">
  <strong>Data and code / Dados e código</strong>
  <span>Official TSE data, processed with the open scripts in <a href="${REPO}">${REPO.replace("https://", "")}</a>. Per-section files for every election are in the repository's data/sections folder.</span>
  <ul>${links}</ul>
</footer>
</body>
</html>
`;
writeFileSync(`${OUT}/index.html`, html);
console.log(`site: ${OUT}/index.html (${html.length} bytes), ${DATASETS.length} datasets, ${TABLES.length} CSV files`);

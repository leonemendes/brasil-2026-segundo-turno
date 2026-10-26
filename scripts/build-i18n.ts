import { PT_MARKUP, PT_JS } from "./i18n-pt.ts";

const file = process.argv[2];
let html = await Bun.file(file).text();
const body = html.slice(html.indexOf('<div class="bz">'), html.indexOf("<script>"));
const blocks = new Set<string>();
for (const tag of ["h1", "h2", "h3", "p", "li", "button", "th"])
  for (const m of body.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"))) if (!(tag === "th" && m[1].includes("<button"))) blocks.add(m[1].trim());
for (const m of body.matchAll(/<span class="bz-k">([\s\S]*?)<\/span>/g)) blocks.add(m[1].trim());
for (const m of body.matchAll(/<div class="bz-ctrlrow"><span>([^<]+)<\/span>/g)) blocks.add(m[1].trim());

const out: Record<string, string> = {}, missing: string[] = [];
for (const en of blocks) {
  if (!/[A-Za-z]{2}/.test(en.replace(/<[^>]+>/g, "")) || /^(EN|PT)$/.test(en)) continue;
  const spans: string[] = [];
  const key = en.replace(/<span class="bz-v"[^>]*>—<\/span>/g, (m) => `{${spans.push(m) - 1}}`);
  const pt = PT_MARKUP[key];
  if (pt == null) { missing.push(key); continue; }
  out[en] = pt.replace(/\{(\d+)\}/g, (_m, i) => spans[+i]);
}
if (missing.length) { console.error("MISSING translations:\n" + missing.join("\n")); process.exit(1); }
const inject = `/*I18N*/const PT_MARKUP = ${JSON.stringify(out)};\nconst PT_JS = ${JSON.stringify(PT_JS)};/*END_I18N*/`;
html = html.replace(/\/\*I18N\*\/[\s\S]*?\/\*END_I18N\*\//, () => inject);
await Bun.write(file, html);
console.log(`i18n: ${Object.keys(out).length} blocks, ${Object.keys(PT_JS).length} script strings`);

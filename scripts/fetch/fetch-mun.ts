import { appendFileSync, existsSync, readFileSync } from "node:fs";

const B = "https://resultados.tse.jus.br/oficial/ele2026/6258/dados";
const out = "data/r2-mun.ndjson";
const cm = await Bun.file("data/mun-cm.json").json();
const done = new Set(existsSync(out) ? readFileSync(out, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).mun) : []);
const only = process.env.ONLY;
const jobs = cm.abr.filter((a: any) => !only || a.cd === only).flatMap((a: any) => a.mu.map((m: any) => ({ uf: a.cd, mun: m.cd, ibge: m.cdi, nm: m.nm }))).filter((j: any) => !done.has(j.mun));
console.log(`todo ${jobs.length}`);
const delay = Number(process.env.DELAY ?? "300");
for (const j of jobs) {
  let r: Response;
  for (;;) {
    r = await fetch(`${B}/${j.uf}/${j.uf}${j.mun}-c0001-e006258-u.json`, { headers: { "User-Agent": "research-script (election analysis)" } });
    if (r.status !== 429 && r.status < 500) break;
    const wait = Number(r.headers.get("retry-after") ?? "0") * 1000 || 90_000;
    console.log(`status ${r.status}, pause ${wait / 1000}s`);
    await Bun.sleep(wait);
  }
  if (!r.ok) { console.log(`skip ${j.uf}${j.mun} ${r.status}`); continue; }
  const d = await r.json();
  const row: any = { ...j };
  for (const ag of d.carg[0].agr) for (const p of ag.par) for (const c of p.cand) row[`c${c.n}`] = +c.vap;
  row.aptos = +d.e.te; row.comp = +d.e.c; row.branco = +d.v.vb; row.nulo = +d.v.tvn;
  appendFileSync(out, JSON.stringify(row) + "\n");
  await Bun.sleep(delay);
}
console.log("finished");

import { writeFileSync } from "node:fs";

const ufs = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to zz br".split(" ");
const out: Record<string, any> = {};
for (const uf of ufs) {
  for (;;) {
    const r = await fetch(`https://resultados.tse.jus.br/oficial/ele2026/6258/dados/${uf}/${uf}-c0001-e006258-u.json`, { headers: { "User-Agent": "research-script (election analysis)" } });
    if (r.status === 429 || r.status >= 500) { console.log(uf, r.status, "pause"); await Bun.sleep(90_000); continue; }
    if (!r.ok) { console.log(uf, r.status); break; }
    const d = await r.json();
    const row: any = {};
    for (const ag of d.carg[0].agr) for (const p of ag.par) for (const c of p.cand) row[`c${c.n}`] = +c.vap;
    row.aptos = +d.e.te; row.comp = +d.e.c; row.branco = +d.v.vb; row.nulo = +d.v.tvn;
    out[uf] = row;
    console.log(uf, row.c13, row.c22);
    break;
  }
  await Bun.sleep(3000);
}
writeFileSync("data/r2-uf.json", JSON.stringify(out));

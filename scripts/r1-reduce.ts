import { appendFileSync } from "node:fs";
const out = process.argv[2];
const RIGHT = process.env.RIGHT ?? "22";
const OFFICIAL = process.env.OFFICIAL ? new Set(process.env.OFFICIAL.split(",")) : null;
const dec = new TextDecoder("latin1");
const secs = new Map<string, any>();
let header: string[] = [];
let idx: Record<string, number> = {};
let rest = "";
const handle = (line: string) => {
  if (!line) return;
  const f = line.split(";").map((x) => x.replace(/^"|"$/g, ""));
  if (!header.length) { header = f; header.forEach((h, i) => (idx[h.replace(/\s/g, "")] = i)); return; }
  if (f[idx.CD_CARGO_PERGUNTA] !== "1") return;
  const key = `${f[idx.SG_UF]}/${f[idx.CD_MUNICIPIO].padStart(5, "0")}/${f[idx.NR_ZONA].padStart(4, "0")}/${f[idx.NR_SECAO].padStart(4, "0")}`;
  let s = secs.get(key);
  if (!s) {
    s = { uf: f[idx.SG_UF].toLowerCase(), mun: f[idx.CD_MUNICIPIO].padStart(5, "0"), zon: f[idx.NR_ZONA].padStart(4, "0"), sec: f[idx.NR_SECAO].padStart(4, "0"), nm: f[idx.NM_MUNICIPIO], open: f[idx.DT_ABERTURA], close: f[idx.DT_ENCERRAMENTO], aptos: +f[idx.QT_APTOS], comp: +f[idx.QT_COMPARECIMENTO], urna: f[idx.DS_TIPO_URNA], c13: 0, c22: 0, other: 0, branco: 0, nulo: 0 };
    secs.set(key, s);
  }
  const tipo = f[idx.DS_TIPO_VOTAVEL], nr = f[idx.NR_VOTAVEL], q = +f[idx.QT_VOTOS];
  if (tipo === "Nominal" && OFFICIAL && !OFFICIAL.has(nr)) s.nulo += q;
  else if (tipo === "Nominal") { if (nr === "13") s.c13 += q; else if (nr === RIGHT) s.c22 += q; else s.other += q; }
  else if (tipo === "Branco") s.branco += q;
  else s.nulo += q;
};
for await (const chunk of Bun.stdin.stream()) {
  const t = rest + dec.decode(chunk, { stream: true });
  const lines = t.split("\n");
  rest = lines.pop()!;
  for (const l of lines) handle(l.replace(/\r$/, ""));
}
handle(rest);
appendFileSync(out, [...secs.values()].map((s) => JSON.stringify(s)).join("\n") + "\n");
console.error(out, secs.size);

import { appendFileSync, existsSync, readFileSync } from "node:fs";

const BASE = "https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna";
const PLEITO = process.env.PLEITO ?? "3221";
const ELEICAO = Number(process.env.ELEICAO ?? "6258");
const CONC = Number(process.env.CONC ?? "48");
const [, , uf, outPath] = process.argv;

type Node = { tag: number; body: Uint8Array; kids?: Node[] };

function parse(b: Uint8Array, off = 0, end = b.length): Node[] {
  const out: Node[] = [];
  while (off < end) {
    const tag = b[off];
    let p = off + 1;
    let len = b[p++];
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + b[p++];
    }
    const body = b.subarray(p, p + len);
    out.push({ tag, body, kids: tag & 0x20 ? parse(b, p, p + len) : undefined });
    off = p + len;
  }
  return out;
}

const int = (n: Node) => n.body.reduce((a, x) => a * 256 + x, 0);
const str = (n: Node) => new TextDecoder("latin1").decode(n.body);

function decodeBu(raw: Uint8Array) {
  const env = parse(raw)[0].kids!;
  const bu = parse(env.find((n) => n.tag === 0x04)!.body)[0].kids!;
  const ds = bu.find((n) => n.tag === 0xa0)!.kids!;
  const res = bu.find((n) => n.tag === 0x30 && n.kids?.[0]?.tag === 0x30 && n.kids[0].kids?.[0]?.tag === 0x02 && n.kids[0].kids.length > 4)!;
  const el = res.kids!.find((n) => int(n.kids![0]) === ELEICAO);
  const row: Record<string, number | string> = { open: str(ds[0]), close: ds[1] ? str(ds[1]) : "" };
  if (!el) return row;
  row.aptos = int(el.kids![1]);
  const rv = el.kids!.find((n) => n.tag === 0x30)!.kids![0].kids!;
  row.comp = int(rv[1]);
  const votaveis = rv[2].kids![0].kids![2].kids!;
  for (const v of votaveis) {
    const tipo = int(v.kids![0]);
    const q = int(v.kids![1]);
    const key = tipo === 1 ? `c${int(v.kids![2].kids![1])}` : tipo === 2 ? "branco" : tipo === 3 ? "nulo" : `t${tipo}`;
    row[key] = ((row[key] as number) ?? 0) + q;
  }
  return row;
}

async function get(url: string, kind: "json" | "bin", tries = 6): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${r.status}`);
      return kind === "json" ? await r.json() : new Uint8Array(await r.arrayBuffer());
    } catch {
      await Bun.sleep(500 * 2 ** i);
    }
  }
  throw new Error(`failed ${url}`);
}

const cs = await get(`${BASE}/${PLEITO}/config/${uf}/${uf}-p00${PLEITO}-cs.json`, "json");
const jobs: { mun: string; zon: string; sec: string }[] = [];
for (const a of cs.abr) for (const m of a.mu) for (const z of m.zon) for (const s of z.sec) jobs.push({ mun: m.cd, zon: z.cd, sec: s.ns });

const done = new Set<string>();
if (existsSync(outPath)) for (const l of readFileSync(outPath, "utf8").split("\n")) if (l) { const j = JSON.parse(l); done.add(`${j.mun}/${j.zon}/${j.sec}`); }
const todo = jobs.filter((j) => !done.has(`${j.mun}/${j.zon}/${j.sec}`));
console.error(`${uf}: ${jobs.length} sections, ${todo.length} to fetch`);

let i = 0, ok = 0, miss = 0;
async function worker() {
  while (i < todo.length) {
    const j = todo[i++];
    const dir = `${BASE}/${PLEITO}/dados/${uf}/${j.mun}/${j.zon}/${j.sec}`;
    const aux = await get(`${dir}/p00${PLEITO}-${uf}-m${j.mun}-z${j.zon}-s${j.sec}-aux.json`, "json");
    const h = aux?.hashes?.filter((x: any) => /Totaliza/.test(x.st)).at(-1) ?? aux?.hashes?.at(-1);
    const buName = h?.arq.find((a: any) => a.tp === "bu")?.nm;
    let row: Record<string, unknown> = { uf, ...j, st: aux?.st ?? "noaux" };
    if (buName) {
      const raw = await get(`${dir}/${h.hash}/${buName}`, "bin");
      if (raw) {
        try { Object.assign(row, decodeBu(raw), { hash: h.hash }); ok++; } catch (e) { row.err = String(e); miss++; }
      } else miss++;
    } else miss++;
    appendFileSync(outPath, JSON.stringify(row) + "\n");
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.error(`${uf}: ok=${ok} miss=${miss}`);

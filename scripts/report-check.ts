import { readdirSync, writeFileSync } from "node:fs";

type S = { uf: string; mun: string; open: number | null; close: number | null; biom: number; comp: number; lula: number; right: number };

const RIGHT = { "2022": "22", "2026": "22" } as const;
const dec = new TextDecoder("latin1");
const clock = (t: string) => {
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})$/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null;
};

async function load(dir: string, year: "2022" | "2026") {
  const secs = new Map<string, S>();
  const generated = new Set<string>();
  for (const z of readdirSync(dir).filter((f) => f.endsWith(".zip")).sort()) {
    const p = Bun.spawn(["bsdtar", "-xOf", `${dir}/${z}`, "*.csv"], { stdout: "pipe" });
    let idx: Record<string, number> | null = null, rest = "";
    const handle = (line: string) => {
      if (!line) return;
      const f = line.split(";").map((x) => x.replace(/^"|"$/g, ""));
      if (!idx) { idx = Object.fromEntries(f.map((h, i) => [h.trim(), i])); return; }
      if (f[idx.CD_CARGO_PERGUNTA] !== "1") return;
      generated.add(`${f[idx.DT_GERACAO]} ${f[idx.HH_GERACAO]}`);
      const key = `${f[idx.SG_UF]}/${f[idx.CD_MUNICIPIO]}/${f[idx.NR_ZONA]}/${f[idx.NR_SECAO]}`;
      let s = secs.get(key);
      if (!s) {
        const biomCol = idx.QT_ELEI_BIOM_SEM_HABILITACAO ?? idx.QT_ELEITORES_BIOMETRIA_NH;
        s = { uf: f[idx.SG_UF].toLowerCase(), mun: f[idx.CD_MUNICIPIO], open: clock(f[idx.DT_ABERTURA]), close: clock(f[idx.DT_ENCERRAMENTO]), biom: +f[biomCol] || 0, comp: +f[idx.QT_COMPARECIMENTO], lula: 0, right: 0 };
        secs.set(key, s);
      }
      if (f[idx.DS_TIPO_VOTAVEL] !== "Nominal") return;
      if (f[idx.NR_VOTAVEL] === "13") s.lula += +f[idx.QT_VOTOS];
      else if (f[idx.NR_VOTAVEL] === RIGHT[year]) s.right += +f[idx.QT_VOTOS];
    };
    for await (const chunk of p.stdout) {
      const lines = (rest + dec.decode(chunk, { stream: true })).split("\n");
      rest = lines.pop()!;
      for (const l of lines) handle(l.replace(/\r$/, ""));
    }
    handle(rest);
  }
  return { secs: [...secs.values()], generated: [...generated].sort() };
}

const sum = (xs: S[]) => {
  const lula = xs.reduce((a, s) => a + s.lula, 0), right = xs.reduce((a, s) => a + s.right, 0);
  return { sections: xs.length, voters: xs.reduce((a, s) => a + s.comp, 0), lula, right, lula_pct: +((100 * lula) / (lula + right)).toFixed(2), lula_lead: lula - right };
};
const pctLula = (s: S) => (s.lula + s.right ? (100 * s.lula) / (s.lula + s.right) : null);

function tzShift(secs: S[]) {
  const hours = new Map<string, Map<number, number>>();
  for (const s of secs) {
    if (s.open === null || s.uf === "zz") continue;
    const h = Math.floor(s.open / 3600), m = hours.get(s.mun) ?? new Map();
    m.set(h, (m.get(h) ?? 0) + 1); hours.set(s.mun, m);
  }
  return new Map([...hours].map(([mun, m]) => [mun, 8 - [...m].sort((a, b) => b[1] - a[1])[0][0]]));
}

function check(secs: S[], year: string) {
  const shift = tzShift(secs);
  const local = secs.filter((s) => s.close !== null && s.uf !== "zz");
  const brt = (s: S) => s.close! + (shift.get(s.mun) ?? 0) * 3600;
  const H17 = 17 * 3600 + 59, H1715 = 17 * 3600 + 15 * 60 + 59, H19 = 19 * 3600;

  const byLocalClock = {
    by_1700_local: sum(local.filter((s) => s.close! <= H17)),
    after_1700_local: sum(local.filter((s) => s.close! > H17)),
    w_1701_1715: sum(local.filter((s) => s.close! > H17 && s.close! <= H1715)),
    w_1716_1859: sum(local.filter((s) => s.close! > H1715 && s.close! < H19)),
    w_after_1900: sum(local.filter((s) => s.close! >= H19)),
  };
  const byLocalClockStates = Object.fromEntries(
    ["ac", "am", "mt", "ms", "ro", "rr", "ba", "pe", "ma", "sp"].map((uf) => {
      const xs = local.filter((s) => s.uf === uf);
      return [uf, { all: xs.length, closed_by_1700_local: xs.filter((s) => s.close! <= H17).length, mode_open_hour: 8 - (shift.get(xs[0]?.mun) ?? 0) }];
    }),
  );
  const byBrasilia = {
    by_1700_brt: sum(local.filter((s) => brt(s) <= H17)),
    after_1700_brt: sum(local.filter((s) => brt(s) > H17)),
    after_1749_brt: sum(local.filter((s) => brt(s) >= 17 * 3600 + 49 * 60)),
  };
  const lateStates = Object.fromEntries(["ba", "pe", "ma", "sp"].map((uf) => {
    const xs = local.filter((s) => s.uf === uf);
    return [uf, { after_1900_local: sum(xs.filter((s) => s.close! >= H19)), whole_state: sum(xs) }];
  }));

  const biomTotal = secs.reduce((a, s) => a + s.biom, 0);
  const voters = secs.reduce((a, s) => a + s.comp, 0);
  const biomBands = [0, 2, 5, 10, 20, 100].slice(0, -1).map((lo, i, arr) => {
    const hi = [2, 5, 10, 20, 100][i];
    const xs = secs.filter((s) => s.comp > 0 && (100 * s.biom) / s.comp >= lo && (100 * s.biom) / s.comp < (hi === 100 ? 101 : hi));
    return { band: `${lo}-${hi}%`, ...sum(xs) };
  });
  const biomByRegion = Object.fromEntries(Object.entries({ N: ["ac", "am", "ap", "pa", "ro", "rr", "to"], NE: ["al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se"], CO: ["df", "go", "ms", "mt"], SE: ["es", "mg", "rj", "sp"], S: ["pr", "rs", "sc"] }).map(([r, ufs]) => {
    const xs = secs.filter((s) => ufs.includes(s.uf));
    const b = xs.reduce((a, s) => a + s.biom, 0), c = xs.reduce((a, s) => a + s.comp, 0);
    return [r, { biom_pct: +((100 * b) / c).toFixed(2), lula_pct: sum(xs).lula_pct }];
  }));

  const valid = secs.filter((s) => s.lula + s.right > 0);
  const unanimity = {
    lula_100: valid.filter((s) => s.right === 0).length, right_100: valid.filter((s) => s.lula === 0).length,
    lula_over_90: valid.filter((s) => pctLula(s)! > 90).length, right_over_90: valid.filter((s) => pctLula(s)! < 10).length,
  };

  return { year, total: sum(secs), byLocalClock, byLocalClockStates, byBrasilia, lateStates, biometrics: { total: biomTotal, pct_of_voters: +((100 * biomTotal) / voters).toFixed(2), bands: biomBands, byRegion: biomByRegion }, unanimity };
}

const [dir22, dir26, out] = process.argv.slice(2);
const d22 = await load(dir22, "2022"), d26 = await load(dir26, "2026");
const result = { generated: { "2022": d22.generated, "2026": d26.generated }, y2022: check(d22.secs, "2022"), y2026: check(d26.secs, "2026") };
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));

# Brasil 2026: segundo turno

Interactive maps and data on Brazil's 2026 presidential runoff (25 October 2026): who won where, how it compares with round 1, the 2022 runoff and the 2018 runoff, and what the court-ordered extension of voting from 17:00 to 19:00 changed.

Mapas interativos e dados do segundo turno presidencial de 2026: quem venceu onde, a comparação com o primeiro turno e com os segundos turnos de 2022 e 2018, e o que a prorrogação da votação das 17h às 19h mudou. O site tem versão em português (botão PT ou `?lang=pt`).

All numbers come from the Tribunal Superior Eleitoral (TSE). Nothing on the site is estimated. Parts that wait for TSE files are marked as pending.

## What is in this repository

| Path | What it is |
| --- | --- |
| `public/` | The website: one page, the datasets as JSON and CSV. Deployed on Vercel. |
| `web/` | The page source: `pages/` (one HTML file per tab, English text), `styles/`, `js/` and `i18n/pt.ts` (the Portuguese text). `scripts/site/build.ts` joins them into `public/index.html` and injects the Portuguese text. |
| `data/sections/*.ndjson.gz` | One row per polling section for the presidential race: 2018 runoff, 2022 runoff, 2026 round 1 and 2026 runoff. Votes per candidate, turnout, the urna's open and close times, and for the 2022 and 2026 runoffs the time the TSE received the result (`recv`). |
| `ds/count-order.html`, `ds/count_order.json` | A page that replays the 2018, 2022 and 2026 runoffs urna by urna: in real receive order, in random orders, and all three in the 2026 order. Built by `scripts/count-order.ts`. |
| `data/r2-mun.ndjson`, `data/r2-uf.json` | 2026 runoff results per municipality and per state, from the TSE results service. |
| `data/abroad-geo.txt` | Country and approximate map position of each overseas voting city (added by hand; the TSE gives only a code and a name). |
| `geo/` | Simplified IBGE municipal boundaries and Natural Earth countries. |
| `timeline.json` | Events of election day with sources, in English and Portuguese. |
| `scripts/` | The pipeline (TypeScript, run with [bun](https://bun.sh)). |

## Sources and checks

- **2018 and 2022 runoffs, 2026 round 1:** TSE open data, "Boletim de urna" files (`dadosabertos.tse.jus.br`). Totals match the official results exactly: 2018 Bolsonaro 57,797,847 and Haddad 47,040,906; 2022 Lula 60,345,999 and Bolsonaro 58,206,354; 2026 round 1 Flávio Bolsonaro 56,104,503 and Lula 53,879,538.
- **2026 runoff:** TSE results service (`resultados.tse.jus.br`). National total Lula 64,256,232 and Flávio Bolsonaro 59,826,041. The 186 overseas cities add up exactly to the official total abroad. The runoff "Boletim de urna" file (`data/sections/2026-runoff.ndjson.gz`, 499,205 sections) gives the same national total.
- **Close times:** urnas record local time. A municipality's official close is its usual opening hour plus 9 hours, so the same rule works for 2018 (17:00 local) and for 2022 and 2026 (17:00 Brasília).

## Pending

- **Sections open after 17:49 in the 2026 runoff.** The TSE runoff "Boletim de urna" file, with every urna's close time, is now in `data/sections/2026-runoff.ndjson.gz`. The site does not use it yet.
- **Votes cast after 17:49.** The urna logs give a time for every vote (not the candidate). The TSE usually publishes them about three days after the vote.

When these files are out, the site shows how many sections stayed open, how many votes were cast after 17:49, and exact bounds on the result without them.

## Rebuild

```sh
bun install
mkdir -p data/r1 data/b22 data/b18
gunzip -c data/sections/2026-round1.ndjson.gz > data/r1/sec.ndjson
gunzip -c data/sections/2022-runoff.ndjson.gz > data/b22/sec.ndjson
gunzip -c data/sections/2018-runoff.ndjson.gz > data/b18/sec.ndjson
bun scripts/analyze.ts
bun scripts/count-order.ts ds/count_order.json
bun run build:data
bun run build
```

`scripts/r1-reduce.ts` builds the section files from the original TSE zips (`bsdtar -xOf <zip> "*.csv" | bun scripts/r1-reduce.ts <out>`; set `RIGHT=17` for 2018). `scripts/fetch-mun.ts` downloads the runoff results per municipality; it waits when the TSE asks it to slow down.

## Limits

- The ballot is secret: the urna log says when each vote was cast, not for whom. So the result "as of 17:49" can only be bounded, not known exactly.
- Overseas city positions are approximate. A few very new municipalities have no shape on the map.

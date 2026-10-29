const N = (v) => (v == null || v === "" ? null : Number(v));
const track = (event, props) => { try { window.bzTrack?.(event, props); } catch {} };
/*I18N*//*END_I18N*/
let LANG = "en", DEC = ".";
const LOC = { en: d3.formatLocale({ decimal: ".", thousands: ",", grouping: [3], currency: ["$", ""] }).format(","), pt: d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["R$", ""] }).format(",") };
const tr = (t) => (LANG === "pt" && PT_JS[t] != null ? PT_JS[t] : t);
const cityName = (a) => (LANG === "pt" && a.city_pt ? a.city_pt : a.city);
const fmtInt = (v) => LOC[LANG](v), fmtSigned = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtInt(Math.abs(v));
const FMT = { pct: (v) => v.toFixed(2).replace(".", DEC) + "%", pct1: (v) => v.toFixed(1).replace(".", DEC) + "%", pct0: (v) => Math.round(v) + "%", int: (v) => fmtInt(v), signed: fmtSigned, pp: (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", DEC) + " pp", r3: (v) => v.toFixed(3).replace(".", DEC), n2: (v) => v.toFixed(2).replace(".", DEC) };
const two = (a, b) => (a == null || b == null || a + b === 0 ? null : (100 * a) / (a + b));
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);

const S = { prepared: false, mun: new Map(), shapes: [], states: [], borders: null, world: [], abroad: [], colors: null, storyView: "br:r1", exArea: "br", exRegion: "World", exCity: null, exMode: "r2", exState: null, exMun: null, sortKey: "margin_change", sortDir: -1, srcKey: "from_other_candidates", srcDir: -1, page: "story" };
window.bzState = S;

function rows(id) { const d = dash.data(id); return d.status === "ok" ? d.data : null; }
const colorCanvas = document.createElement("canvas"); colorCanvas.width = colorCanvas.height = 1;
function resolveColor(c, under) {
  const el = document.createElement("span"); el.style.color = c; document.querySelector(".bz").appendChild(el); const css = getComputedStyle(el).color; el.remove();
  const g = colorCanvas.getContext("2d", { willReadFrequently: true }); g.clearRect(0, 0, 1, 1);
  if (under) { g.fillStyle = under; g.fillRect(0, 0, 1, 1); }
  g.fillStyle = css; g.fillRect(0, 0, 1, 1);
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${gr}, ${b})`;
}
function themeColors() {
  const list = dash.colors.map((c) => resolveColor(c));
  const hue = (c) => { const h = d3.hsl(c).h; return isNaN(h) ? 999 : h; };
  const red = list.slice().sort((a, b) => Math.min(Math.abs(hue(a) - 0), Math.abs(hue(a) - 360)) - Math.min(Math.abs(hue(b) - 0), Math.abs(hue(b) - 360)))[0];
  const blue = list.slice().sort((a, b) => Math.abs(hue(a) - 215) - Math.abs(hue(b) - 215))[0];
  const panel = resolveColor("var(--color-panel)"), mid = d3.interpolateRgb(panel, resolveColor("var(--color-fg-muted)", panel))(0.22), muted = resolveColor("var(--cds-chart-muted)", panel), fg = resolveColor("var(--color-fg)"), fgm = resolveColor("var(--color-fg-muted)"), warn = resolveColor("var(--color-warn)");
  return { red, blue, mid, muted, panel, fg, fgm, warn, list };
}

function bindValues() {
  document.querySelectorAll(".bz .bz-v").forEach((el) => {
    const d = rows(el.dataset.source);
    if (!d) { el.textContent = "—"; return; }
    const where = el.dataset.where ? Object.fromEntries(el.dataset.where.split("&").map((kv) => kv.split("=").map(decodeURIComponent))) : null;
    const row = where ? d.find((r) => Object.entries(where).every(([k, v]) => String(r[k]) === v)) : d[0];
    const v = row ? row[el.dataset.field] : null;
    el.textContent = v == null ? "—" : el.dataset.fmt ? FMT[el.dataset.fmt](Number(v)) : String(v);
  });
}

function prepare() {
  if (S.prepared) return true;
  const shapes = rows("map_municipalities"), st = rows("map_states"), world = rows("map_world");
  if (!shapes || !st || !world) return false;
  S.shapes = shapes.map((r) => ({ ibge: String(r.ibge), p: new Path2D(r.path) }));
  S.states = st.filter((r) => r.uf !== "borders").map((r) => ({ uf: r.uf, p: new Path2D(r.path), x: N(r.x), y: N(r.y), box: [N(r.x0), N(r.y0), N(r.x1), N(r.y1)] }));
  S.borders = new Path2D(st.find((r) => r.uf === "borders").path);
  S.world = world.map((r) => ({ iso: String(r.iso), country: r.country, path: r.path }));
  S.prepared = true;
  return true;
}
function indexData() {
  const m = rows("municipalities");
  if (m && S.mun.size !== m.length) {
    S.mun = new Map(m.map((r) => [String(r.ibge), r]));
    const dl = document.getElementById("exMunList");
    dl.replaceChildren(...m.map((r) => { const o = document.createElement("option"); o.value = `${r.name} (${String(r.uf).toUpperCase()})`; return o; }));
  }
  const a = rows("abroad");
  if (a) S.abroad = a;
}

function placeTip(tip, box, ev) {
  const b = box.getBoundingClientRect(); let x = ev.clientX - b.left + 14, y = ev.clientY - b.top + 14;
  if (x + 260 > b.width) x = Math.max(4, ev.clientX - b.left - 264); if (y + 150 > b.height) y = Math.max(4, ev.clientY - b.top - 154);
  tip.style.left = x + "px"; tip.style.top = y + "px";
}

function showPage(p, fromLink) {
  S.page = p;
  document.querySelectorAll(".bz-tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.page === p)));
  document.querySelectorAll(".bz-page").forEach((s) => (s.hidden = s.id !== p));
  if (!fromLink) dash.setLink(p);
  track("tab_viewed", { tab: p, via: fromLink ? "link" : "click" });
  redraw();
}

document.querySelectorAll(".bz-tabs button").forEach((b) => b.addEventListener("click", () => showPage(b.dataset.page)));

const I18N_EL = [];
document.querySelectorAll(".bz h1, .bz h2, .bz h3, .bz p, .bz li, .bz button, .bz th, .bz span.bz-k, .bz .bz-ctrlrow > span").forEach((el) => { const en = el.innerHTML.trim(); if (PT_MARKUP[en] != null) I18N_EL.push([el, en]); });
function applyLang(l) {
  LANG = l === "pt" ? "pt" : "en"; DEC = LANG === "pt" ? "," : ".";
  for (const [el, en] of I18N_EL) el.innerHTML = LANG === "pt" ? PT_MARKUP[en] : en;
  document.getElementById("exSearch").placeholder = tr("Find a municipality");
  document.querySelectorAll(".bz-lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
  document.documentElement.lang = LANG === "pt" ? "pt-BR" : "en";
}
document.querySelectorAll(".bz-lang button").forEach((b) => b.addEventListener("click", () => {
  applyLang(b.dataset.lang); dash.setParams({ lang: LANG }); track("language_changed", { lang: LANG });
  bindValues(); fillStateSelect(); loadNote(); extensionPanel(document.getElementById("extCards")); redraw();
}));
let langSet = false;
let linked = false;
function redraw() {
  if (!S.prepared) return;
  if (S.page === "story") storyVisual();
  if (S.page === "explore") { exploreVisual(); stateTable(); sourcesTable(); }
  if (S.page === "patterns") patterns();
  if (S.page === "day") { timeline(); lateTiles(); const s = drawCurves(document.getElementById("curvesSvg"), document.getElementById("curvesTip")); if (s) curvesLegend(document.getElementById("curvesLegend"), s); drawLanes(document.getElementById("lanesSvg")); drawLateMinutes(document.getElementById("lateMinutesSvg"), document.getElementById("lateMinutesTip")); lateStatesTable(); extensionPanel(document.getElementById("extCards")); }
}

dash.onData(() => {
  if (!langSet) { langSet = true; const p = dash.params().lang; applyLang(p ?? "pt"); }
  S.colors = themeColors();
  bindValues();
  if (!prepare()) return;
  indexData(); fillStateSelect(); loadNote(); extensionPanel(document.getElementById("extCards"));
  if (!linked) { linked = true; const h = location.hash.slice(1); if (["story", "explore", "day", "patterns", "method"].includes(h)) { showPage(h, true); return; } }
  redraw();
});

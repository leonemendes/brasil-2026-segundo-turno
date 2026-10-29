(() => {
  const DATASETS = window.DASH_DATASETS;
  const store = new Map();
  const calcs = [];
  const listeners = [];
  let params = {};
  try { const p = new URLSearchParams(location.search).get("lang"); if (p) params.lang = p; } catch {}

  const notify = () => { for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } } };
  const runCalcs = () => {
    for (const c of calcs) {
      const inputs = c.inputs.map((id) => store.get(id));
      if (inputs.every((d) => d && d.status === "ok")) {
        try { store.set(c.id, { status: "ok", data: c.fn(...inputs.map((d) => d.data)) }); }
        catch (e) { console.error("calc", c.id, e); store.set(c.id, { status: "error", data: [], message: String(e) }); }
      }
    }
  };

  window.dash = {
    data: (id) => store.get(id) ?? { status: "loading", data: [] },
    calc: (id, def) => { calcs.push({ id, inputs: def.inputs, fn: def.fn }); runCalcs(); },
    onData: (fn) => { listeners.push(fn); fn(); },
    params: () => ({ ...params }),
    setParams: (p) => { params = { ...params, ...p }; try { const u = new URL(location.href); if (p.lang) u.searchParams.set("lang", p.lang); history.replaceState(null, "", u); } catch {} notify(); },
    resetParams: () => { params = {}; notify(); },
    setLink: (name) => { try { history.replaceState(null, "", "#" + name); } catch {} },
    colors: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
    refresh: () => {},
    loader: () => {},
  };

  for (const id of DATASETS) {
    store.set(id, { status: "loading", data: [] });
    fetch(`data/${id}.json`).then((r) => r.json()).then((rows) => {
      store.set(id, { status: "ok", data: rows });
      runCalcs();
      notify();
    }).catch((e) => { store.set(id, { status: "error", data: [], message: String(e) }); notify(); });
  }
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(notify, 150); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", notify);
})();

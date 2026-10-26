(() => {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) { window.bzTrack = () => {}; return; }
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify reset get_distinct_id set_config opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  window.posthog.init("phc_AeDmijyMCtxGKNzrNb957AzZ55DoagANf2rRUc8vdERW", {
    api_host: "https://eu.i.posthog.com",
    cookieless_mode: "always",
    person_profiles: "identified_only",
    disable_session_recording: true,
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
  });
  window.bzTrack = (event, props) => window.posthog.capture(event, { ...props, lang: document.documentElement.lang });
  document.addEventListener("click", (e) => { const a = e.target.closest(".site-foot a[download]"); if (a) window.bzTrack("data_downloaded", { file: a.getAttribute("href") }); });
})();

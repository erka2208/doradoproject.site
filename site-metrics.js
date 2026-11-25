(() => {
  "use strict";

  // Only the pathname, never query strings, search text, referrers or identifiers.
  function countView() {
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
    if (location.protocol !== "https:" ||
        !["doradoproject.com", "www.doradoproject.com"].includes(location.hostname)) return;
    if (!self.fetch) return;
    fetch("https://knzc.nl/api/dorado-weergave", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: location.pathname,
      credentials: "omit",
      mode: "cors",
      referrerPolicy: "no-referrer",
      keepalive: true,
    }).catch(() => {});
  }
  if (document.prerendering) document.addEventListener("prerenderingchange", countView, { once: true });
  else countView();
  window.addEventListener("pageshow", event => { if (event.persisted) countView(); });

  // Keep the real Spotify button as a fallback and do not load the embed until clicked.
  const button = document.querySelector("[data-spotify-load]");
  const template = document.querySelector("template[data-spotify-template]");
  if (button && template) button.addEventListener("click", () => {
    const player = template.content.firstElementChild?.cloneNode(true);
    if (!player) return;
    button.closest(".spotify-load").replaceWith(player);
    player.focus();
  });
})();

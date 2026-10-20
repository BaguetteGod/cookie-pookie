/*
 * Cookie Pookie — main-world script.
 * Runs in the page's own JavaScript context so it can call consent platform
 * APIs directly. It waits for the content script's go-ahead (which only comes
 * when the extension is enabled for this site), then polls for known APIs.
 */
(() => {
  const POLL_MS = 500;
  const GIVE_UP_MS = 10000;

  const report = (cmp) =>
    window.postMessage({ source: "cookie-pookie-page", type: "rejected", cmp }, "*");

  // Each entry: platform name -> function that rejects via its API and returns true,
  // or returns false when the API isn't (yet) on the page.
  const APIS = {
    Didomi() {
      const d = window.Didomi;
      if (!d || typeof d.setUserDisagreeToAll !== "function") return false;
      d.setUserDisagreeToAll();
      return true;
    },
    Usercentrics() {
      const uc = window.UC_UI;
      if (!uc || typeof uc.denyAllConsents !== "function") return false;
      if (typeof uc.isInitialized === "function" && !uc.isInitialized()) return false;
      uc.denyAllConsents();
      if (typeof uc.closeCMP === "function") uc.closeCMP();
      return true;
    },
    Cookiebot() {
      const cb = window.Cookiebot;
      if (!cb || typeof cb.submitCustomConsent !== "function" || !cb.dialog) return false;
      // Arguments: preferences, statistics, marketing. Necessary is always on.
      cb.submitCustomConsent(false, false, false);
      return true;
    }
  };

  function start() {
    const started = Date.now();
    const timer = setInterval(() => {
      for (const [name, reject] of Object.entries(APIS)) {
        try {
          if (reject()) {
            clearInterval(timer);
            report(name);
            return;
          }
        } catch (e) {
          // A broken or changed API should never break the page.
        }
      }
      if (Date.now() - started > GIVE_UP_MS) clearInterval(timer);
    }, POLL_MS);
  }

  window.addEventListener("message", function onRun(event) {
    if (event.source !== window || !event.data || event.data.source !== "cookie-pookie-content") return;
    if (event.data.type !== "run") return;
    window.removeEventListener("message", onRun);
    start();
  });
})();

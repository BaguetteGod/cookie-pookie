/*
 * Cookie Pookie — content script (isolated world).
 * Runs in every frame and hands the page to DuckDuckGo's autoconsent engine
 * (vendor/autoconsent/content-lib.js, loaded just before this file).
 *
 * The engine sends its messages (init, eval, results) to the background script,
 * which answers with rules and settings, runs main-world code, and keeps count.
 */
/* global CookiePookieAutoConsent */

(() => {
  if (typeof CookiePookieAutoConsent !== "function") {
    console.error("[Cookie Pookie] autoconsent library missing");
    return;
  }

  function start() {
    const consent = new CookiePookieAutoConsent((message) =>
      browser.runtime.sendMessage(message).catch(() => {
        // The background can be briefly unavailable (e.g. while the add-on updates).
      })
    );

    browser.runtime.onMessage.addListener((message) =>
      Promise.resolve(consent.receiveMessageCallback(message))
    );
  }

  // Hidden and tiny frames (tracking pixels, ad syncing) can't show a banner, and
  // starting the engine costs a few milliseconds per frame. So in those, start it
  // only once the frame is big enough. The media query also notices a hidden
  // (display: none) frame being shown, which no resize event reports.
  const bigEnough = window.matchMedia("(min-width: 100px) and (min-height: 40px)");
  if (window === window.top || bigEnough.matches) {
    start();
  } else {
    bigEnough.addEventListener("change", function onChange() {
      if (!bigEnough.matches) return;
      bigEnough.removeEventListener("change", onChange);
      start();
    });
  }
})();

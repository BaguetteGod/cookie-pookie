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

  const consent = new CookiePookieAutoConsent((message) =>
    browser.runtime.sendMessage(message).catch(() => {
      // The background can be briefly unavailable (e.g. while the add-on updates).
    })
  );

  browser.runtime.onMessage.addListener((message) =>
    Promise.resolve(consent.receiveMessageCallback(message))
  );
})();

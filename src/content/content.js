/*
 * Cookie Pookie — content script (isolated world).
 * Runs in every frame. Asks the background whether it may act on this site,
 * then watches the page for a consent banner and rejects it.
 */
/* global COOKIE_POOKIE_RULES, COOKIE_POOKIE_REJECT_TEXT, COOKIE_POOKIE_ACCEPT_TEXT */

(() => {
  const WATCH_MS = 15000; // stop watching for banners after this long
  const NEGATION = /\b(without|sans|ohne|sin|senza|sem|zonder)\b/i;
  let done = false;
  let observer = null;

  const log = (...args) => console.debug("[Cookie Pookie]", ...args);

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function looksLikeAccept(el) {
    const text = (el.textContent || "").trim();
    return COOKIE_POOKIE_ACCEPT_TEXT.test(text) && !NEGATION.test(text);
  }

  function rootFor(rule) {
    if (!rule.shadowHost) return document;
    const host = document.querySelector(rule.shadowHost);
    return (host && host.shadowRoot) || document;
  }

  function safeClick(el) {
    if (!el || !isVisible(el) || looksLikeAccept(el)) return false;
    el.click();
    return true;
  }

  async function runRule(rule) {
    const root = rootFor(rule);
    for (const step of rule.steps) {
      if (step.wait) {
        await new Promise((r) => setTimeout(r, step.wait));
        continue;
      }
      let target = null;
      if (step.click) {
        target = [...root.querySelectorAll(step.click)].find(isVisible);
      } else if (step.clickText) {
        const [selector, pattern] = step.clickText;
        target = [...root.querySelectorAll(selector)].find(
          (el) => isVisible(el) && pattern.test((el.textContent || "").trim())
        );
      }
      if (!safeClick(target)) return false;
    }
    return true;
  }

  // Fallback for banners no rule knows: a visible container whose id/class
  // mentions cookies or consent, holding a button whose whole label means "reject".
  function runGeneric() {
    const containers = document.querySelectorAll(
      "[id*='cookie' i], [class*='cookie' i], [id*='consent' i], [class*='consent' i], [id*='gdpr' i], [class*='gdpr' i]"
    );
    for (const box of containers) {
      if (!isVisible(box)) continue;
      const buttons = box.querySelectorAll("button, a[role='button'], [role='button'], input[type='button']");
      for (const btn of buttons) {
        const label = (btn.textContent || btn.value || "").trim().replace(/\s+/g, " ");
        if (COOKIE_POOKIE_REJECT_TEXT.test(label) && safeClick(btn)) return true;
      }
    }
    return false;
  }

  function finish(method) {
    if (done) return;
    done = true;
    if (observer) observer.disconnect();
    log("rejected via", method);
    browser.runtime.sendMessage({ type: "handled", method, host: location.hostname }).catch(() => {});
  }

  async function check() {
    if (done) return;
    for (const rule of COOKIE_POOKIE_RULES) {
      if (document.querySelector(rule.detect) && (await runRule(rule))) {
        finish(rule.name);
        return;
      }
    }
    if (document.body && runGeneric()) finish("generic");
  }

  let pending = false;
  function scheduleCheck() {
    if (pending || done) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      check();
    }, 250);
  }

  // Results from the main-world script (platform JavaScript APIs).
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "cookie-pookie-page") return;
    if (event.data.type === "rejected") finish(`${event.data.cmp} API`);
  });

  async function start() {
    let allowed = false;
    try {
      const reply = await browser.runtime.sendMessage({ type: "shouldRun" });
      allowed = Boolean(reply && reply.run);
    } catch (e) {
      log("could not reach background", e);
    }
    if (!allowed) return;

    // Let the main-world script start trying platform APIs.
    window.postMessage({ source: "cookie-pookie-content", type: "run" }, "*");

    observer = new MutationObserver(scheduleCheck);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scheduleCheck();
    setTimeout(() => observer && observer.disconnect(), WATCH_MS);
  }

  start();
})();

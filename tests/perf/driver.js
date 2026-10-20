// Added to every page by tests/perf/run.mjs. Once the page has loaded (and, for
// pages that need it, finished its own measurement), reports the timings to the
// local server and moves on to the next page by itself, so no browser automation
// is attached while measuring: automation adds per-frame overhead of its own.
(() => {
  const params = new URLSearchParams(location.search);
  if (!params.has("run")) return; // an iframe, not a measured page

  const html = document.documentElement;
  // Page-specific results, set on <html> by the page or by tests/e2e/fixtures/shared.js.
  const extra = { updateMs: "DOM updates", clickedAt: "banner rejected after" };
  const waitForExtra = params.get("wait"); // a key of `extra` to wait for, if any
  const deadline = performance.now() + 5000;

  function report() {
    if (waitForExtra && !html.dataset[waitForExtra] && performance.now() < deadline) {
      setTimeout(report, 25);
      return;
    }
    const nav = performance.getEntriesByType("navigation")[0];
    const values = { "DOM ready": nav.domContentLoadedEventEnd, "fully loaded": nav.loadEventEnd };
    for (const [key, name] of Object.entries(extra)) if (html.dataset[key]) values[name] = Number(html.dataset[key]);
    // Move on only once the report has arrived, so the last one isn't lost when the run ends.
    fetch(`/report?${params}`, { method: "POST", body: JSON.stringify(values) }).finally(() => location.replace(`/next?${params}`));
  }
  addEventListener("load", () => setTimeout(report, 50));
})();

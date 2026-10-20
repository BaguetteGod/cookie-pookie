// Test-only content script, added to a copy of the add-on by tests/e2e/run.mjs
// and never shipped. When the engine reports a handled banner, it records the
// rule's name on <html data-handled-by="...">, so tests can check which rule
// (or the heuristics) did the work.
const sendMessage = browser.runtime.sendMessage.bind(browser.runtime);
browser.runtime.sendMessage = (message) => {
  if (message && message.type === "autoconsentDone") {
    const html = document.documentElement;
    html.dataset.handledBy = html.dataset.handledBy ? `${html.dataset.handledBy},${message.cmp}` : message.cmp;
  }
  return sendMessage(message);
};

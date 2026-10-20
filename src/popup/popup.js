/* Cookie Pookie — toolbar popup. */

const $ = (id) => document.getElementById(id);

function describe(results) {
  if (!results.length) return "No cookie banner handled on this page.";
  return results
    .map(({ cmp, cosmetic }) => (cosmetic ? `Hid the ${cmp} banner (it had no reject option).` : `Rejected cookies on the ${cmp} banner.`))
    .join(" ");
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try {
    const url = new URL(tab.url);
    host = url.protocol.startsWith("http") ? url.hostname : "";
  } catch {
    host = "";
  }

  const settings = await browser.storage.local.get({ enabled: true, disabledSites: [], totalHandled: 0 });
  const { results } = await browser.runtime.sendMessage({ type: "getTabResults", tabId: tab.id });

  $("enabled").checked = settings.enabled;
  $("host").textContent = host || "this page";
  $("site").checked = !settings.disabledSites.includes(host);
  $("site").disabled = !host || !settings.enabled;
  $("page-status").textContent = describe(results);
  $("total").textContent = settings.totalHandled;

  $("enabled").addEventListener("change", async (e) => {
    await browser.storage.local.set({ enabled: e.target.checked });
    $("site").disabled = !host || !e.target.checked;
  });

  $("site").addEventListener("change", async (e) => {
    const { disabledSites } = await browser.storage.local.get({ disabledSites: [] });
    const next = new Set(disabledSites);
    if (e.target.checked) next.delete(host);
    else next.add(host);
    await browser.storage.local.set({ disabledSites: [...next] });
  });
}

init();

/* Cookie Pookie — toolbar popup. */

const $ = (id) => document.getElementById(id);

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try {
    host = new URL(tab.url).hostname;
  } catch {
    host = "";
  }

  const settings = await browser.storage.local.get({ enabled: true, disabledSites: [], totalRejected: 0 });
  const { count } = await browser.runtime.sendMessage({ type: "getTabCount", tabId: tab.id });

  $("enabled").checked = settings.enabled;
  $("host").textContent = host || "this page";
  $("site").checked = !settings.disabledSites.includes(host);
  $("site").disabled = !host || !settings.enabled;
  $("tab-count").textContent = count;
  $("total").textContent = settings.totalRejected;

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

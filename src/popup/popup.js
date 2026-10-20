/* Cookie Pookie — toolbar popup. */
/* global buildReportUrl */

const $ = (id) => document.getElementById(id);

function describe(results) {
  if (!results.length) return "No cookie banner handled on this page.";
  return results
    .map(({ cmp, cosmetic }) => (cosmetic ? `Hid the ${cmp} banner (it had no reject option).` : `Rejected cookies on the ${cmp} banner.`))
    .join(" ");
}

async function engineVersion() {
  try {
    const text = await (await fetch(browser.runtime.getURL("vendor/autoconsent/VERSION"))).text();
    return text.split("\n")[0].trim() || "autoconsent (unknown version)";
  } catch {
    return "autoconsent (unknown version)";
  }
}

const ALL_SITES = { origins: ["<all_urls>"] };

// Firefox can leave host access ungranted (often on Android, or if the user
// revoked it). Without it the content scripts never run, so ask for it here.
async function checkPermission() {
  try {
    $("permission-warning").hidden = await browser.permissions.contains(ALL_SITES);
  } catch {
    // If the check itself fails, don't block the rest of the popup.
  }
}

async function init() {
  await checkPermission();
  $("grant").addEventListener("click", async () => {
    if (await browser.permissions.request(ALL_SITES)) $("permission-warning").hidden = true;
  });

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
  const total = settings.totalHandled;
  $("total").textContent = `${total} ${total === 1 ? "banner" : "banners"} handled in total`;
  $("report").disabled = !host;

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

  $("report").addEventListener("click", async () => {
    const url = buildReportUrl({
      pageUrl: tab.url,
      results,
      addonVersion: browser.runtime.getManifest().version,
      engineVersion: await engineVersion(),
      userAgent: navigator.userAgent
    });
    await browser.tabs.create({ url });
    window.close();
  });
}

init();

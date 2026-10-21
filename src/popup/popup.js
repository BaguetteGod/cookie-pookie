/* Cookie Pookie — toolbar popup. */
/* global buildReportUrl, t, language, localize */

const $ = (id) => document.getElementById(id);

function describe(results) {
  if (!results.length) return t("statusNone");
  return results.map(({ cmp, cosmetic }) => t(cosmetic ? "statusHidden" : "statusRejected", cmp)).join(" ");
}

// "On <strong>example.com</strong>": the site name can sit anywhere in the
// translated sentence, so split the message around it.
function showSiteLabel(host) {
  const marker = "\u0001";
  const [before, after = ""] = t("siteLabel", marker).split(marker);
  const name = document.createElement("strong");
  name.textContent = host || t("thisPage");
  $("site-label").replaceChildren(before, name, after);
}

// Picks e.g. total_one, total_few, ... by the language's plural rules, falling back to total_other.
function plural(prefix, count) {
  const category = new Intl.PluralRules(language).select(count);
  const formatted = count.toLocaleString(language);
  return t(`${prefix}_${category}`, formatted) || t(`${prefix}_other`, formatted);
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
  localize();
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

  const settings = await browser.storage.local.get({ enabled: true, deleteTrackingCookies: true, disabledSites: [], totalHandled: 0 });
  const { results, cookiesDeleted } = await browser.runtime.sendMessage({ type: "getTabResults", tabId: tab.id });

  // The per-site switch covers both features, so it's only greyed out when both are off.
  const updateSiteSwitch = () => ($("site").disabled = !host || (!$("enabled").checked && !$("cookies").checked));

  $("enabled").checked = settings.enabled;
  $("cookies").checked = settings.deleteTrackingCookies;
  showSiteLabel(host);
  $("site").checked = !settings.disabledSites.includes(host);
  updateSiteSwitch();
  $("page-status").textContent = describe(results);
  $("cookie-status").textContent = plural("cookiesDeleted", cookiesDeleted);
  $("cookie-status").hidden = !host || !settings.deleteTrackingCookies;
  $("total").textContent = plural("total", settings.totalHandled);
  $("report").disabled = !host;

  $("enabled").addEventListener("change", async (e) => {
    await browser.storage.local.set({ enabled: e.target.checked });
    updateSiteSwitch();
  });

  $("cookies").addEventListener("change", async (e) => {
    await browser.storage.local.set({ deleteTrackingCookies: e.target.checked });
    updateSiteSwitch();
  });

  $("site").addEventListener("change", async (e) => {
    const { disabledSites } = await browser.storage.local.get({ disabledSites: [] });
    const next = new Set(disabledSites);
    if (e.target.checked) next.delete(host);
    else next.add(host);
    await browser.storage.local.set({ disabledSites: [...next] });
  });

  $("manage").addEventListener("click", async () => {
    await browser.runtime.openOptionsPage();
    window.close();
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

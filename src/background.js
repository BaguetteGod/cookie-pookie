/*
 * Cookie Pookie — background script.
 * Serves autoconsent's rules and settings to each frame, runs the engine's
 * main-world snippets, keeps count of handled banners, and deletes tracking
 * cookies as soon as they're set.
 *
 * vendor/autoconsent/background-lib.js is loaded first and provides
 * CookiePookieAutoConsentLib = { snippets, filterCompactRules }.
 * src/trackers.js provides isTrackingCookie and the cookie helpers.
 *
 * Storage (browser.storage.local):
 *   enabled:               boolean, rejecting banners on/off (default true)
 *   deleteTrackingCookies: boolean, deleting tracking cookies on/off (default true)
 *   disabledSites:         string[], hostnames where Cookie Pookie stays out (both features)
 *   totalHandled:          number, banners handled since install
 */
/* global CookiePookieAutoConsentLib, isTrackingCookie, hostsRelated, hostOf, cookieHosts, cookieUrl */

const DEFAULTS = { enabled: true, deleteTrackingCookies: true, disabledSites: [], totalHandled: 0 };

// Settings passed to the autoconsent engine. Anything left out uses the library default.
const ENGINE_CONFIG = {
  autoAction: "optOut", // always reject, never accept
  enablePrehide: true, // hide known banners while the engine works, to avoid flicker
  enableCosmeticRules: true, // hide banners that offer no real "reject" choice
  enableGeneratedRules: true,
  enableHeuristicDetection: true, // catch banners from platforms with no rule
  heuristicMode: "reject", // heuristics only ever click reject buttons
  enablePopupMutationObserver: true,
  logs: { lifecycle: false, rulesteps: false, detectionsteps: false, evals: false, errors: true, messages: false, waits: false }
};

async function getSettings() {
  return { ...DEFAULTS, ...(await browser.storage.local.get(Object.keys(DEFAULTS))) };
}

// The compact rules are ~360 KB, so load them once per background lifetime.
let rulesPromise = null;
function loadRules() {
  if (!rulesPromise) {
    rulesPromise = fetch(browser.runtime.getURL("vendor/autoconsent/compact-rules.json")).then((r) => r.json());
  }
  return rulesPromise;
}

// Banners handled per tab since its last page load: [{ cmp, cosmetic }].
const tabResults = new Map();

// Badges aren't shown on every platform (e.g. some Firefox for Android versions),
// so failures here are ignored rather than breaking the counting.
function setBadge(tabId) {
  const count = (tabResults.get(tabId) || []).length;
  try {
    browser.action.setBadgeText({ tabId, text: count ? String(count) : "" })?.catch?.(() => {});
    browser.action.setBadgeBackgroundColor({ tabId, color: "#8a5a2b" })?.catch?.(() => {});
  } catch {
    // not supported here
  }
}

async function handleInit(sender) {
  const tabId = sender.tab.id;
  const frameId = sender.frameId;
  const frameUrl = sender.url || "";
  const settings = await getSettings();
  // Use the tab's top-level site, so the per-site switch also covers iframes.
  const enabled = settings.enabled && !settings.disabledSites.includes(hostOf(sender.tab.url));

  const rules = enabled
    ? { autoconsent: [], compact: CookiePookieAutoConsentLib.filterCompactRules(await loadRules(), { url: frameUrl, mainFrame: frameId === 0 }) }
    : { autoconsent: [] };

  await browser.tabs.sendMessage(
    tabId,
    { type: "initResp", rules, config: { ...ENGINE_CONFIG, enabled } },
    { frameId }
  );
}

async function handleEval(message, sender) {
  const tabId = sender.tab.id;
  const frameId = sender.frameId;
  let result = false;
  const snippet = CookiePookieAutoConsentLib.snippets[message.snippetId];
  if (snippet) {
    try {
      const [injection] = await browser.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: "MAIN",
        func: snippet
      });
      result = injection ? injection.result : false;
    } catch (e) {
      result = false;
    }
  }
  await browser.tabs.sendMessage(tabId, { id: message.id, type: "evalResp", result }, { frameId });
}

async function handleDone(message, sender) {
  const tabId = sender.tab.id;
  const results = tabResults.get(tabId) || [];
  results.push({ cmp: message.cmp, cosmetic: Boolean(message.isCosmetic) });
  tabResults.set(tabId, results);
  setBadge(tabId);
  const { totalHandled } = await getSettings();
  await browser.storage.local.set({ totalHandled: totalHandled + 1 });
}

// Tracking cookies deleted per tab since its last page load, as "domain name"
// keys. Scripts often set the same cookie again and again, so each counts once.
const tabCookies = new Map();

async function countDeleted(cookie) {
  const hosts = cookieHosts(cookie);
  const key = `${cookie.domain} ${cookie.name}`;
  for (const tab of await browser.tabs.query({})) {
    const tabHost = hostOf(tab.url);
    if (!hosts.some((host) => hostsRelated(host, tabHost))) continue;
    if (!tabCookies.has(tab.id)) tabCookies.set(tab.id, new Set());
    tabCookies.get(tab.id).add(key);
  }
}

// Deletes the cookie if it's a tracking cookie and Cookie Pookie isn't off for its site.
async function deleteIfTracking(cookie) {
  if (!isTrackingCookie(cookie.name)) return;
  const { deleteTrackingCookies, disabledSites } = await getSettings();
  if (!deleteTrackingCookies) return;
  const hosts = cookieHosts(cookie);
  if (disabledSites.some((site) => hosts.some((host) => hostsRelated(host, site)))) return;
  // The cookie's own store and partition, or Firefox won't find cookies kept per site or per container.
  const removed = await browser.cookies.remove({
    url: cookieUrl(cookie),
    name: cookie.name,
    storeId: cookie.storeId,
    firstPartyDomain: cookie.firstPartyDomain,
    partitionKey: cookie.partitionKey ?? undefined
  });
  if (removed) await countDeleted(cookie);
}

// Deletes tracking cookies already in the browser, e.g. from before install or
// from while the switch was off. Covers every container, partition and, if allowed, private windows.
async function sweepCookies() {
  for (const store of await browser.cookies.getAllCookieStores()) {
    const cookies = await browser.cookies.getAll({ storeId: store.id, firstPartyDomain: null, partitionKey: {} });
    for (const cookie of cookies) await deleteIfTracking(cookie);
  }
}

browser.cookies.onChanged.addListener(({ removed, cookie }) => {
  if (!removed) deleteIfTracking(cookie).catch((e) => console.error("[Cookie Pookie] cookie removal failed", e));
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.deleteTrackingCookies?.newValue) {
    sweepCookies().catch((e) => console.error("[Cookie Pookie] cookie sweep failed", e));
  }
});

browser.runtime.onInstalled.addListener(() => {
  sweepCookies().catch((e) => console.error("[Cookie Pookie] cookie sweep failed", e));
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "getTabResults") {
    return Promise.resolve({
      results: tabResults.get(message.tabId) || [],
      cookiesDeleted: tabCookies.get(message.tabId)?.size || 0
    });
  }

  // Everything below comes from the autoconsent engine in a content script.
  if (!sender.tab) return undefined;
  switch (message.type) {
    case "init":
      handleInit(sender).catch((e) => console.error("[Cookie Pookie] init failed", e));
      break;
    case "eval":
      handleEval(message, sender).catch((e) => console.error("[Cookie Pookie] eval failed", e));
      break;
    case "autoconsentDone":
      handleDone(message, sender);
      break;
    case "autoconsentError":
      console.warn("[Cookie Pookie] engine error", message.details);
      break;
    default:
      break;
  }
  return undefined;
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabResults.delete(tabId);
    tabCookies.delete(tabId);
    setBadge(tabId);
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabResults.delete(tabId);
  tabCookies.delete(tabId);
});

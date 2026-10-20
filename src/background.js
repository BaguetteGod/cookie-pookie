/*
 * Cookie Pookie — background script.
 * Holds settings, decides whether content scripts may act on a site,
 * and keeps count of rejected banners.
 *
 * Storage (browser.storage.local):
 *   enabled:       boolean, global on/off (default true)
 *   disabledSites: string[], hostnames where Cookie Pookie stays out
 *   totalRejected: number, banners rejected since install
 */

const DEFAULTS = { enabled: true, disabledSites: [], totalRejected: 0 };

async function getSettings() {
  return { ...DEFAULTS, ...(await browser.storage.local.get(Object.keys(DEFAULTS))) };
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Rejections per tab since the last page load, for the toolbar badge.
const tabCounts = new Map();

function setBadge(tabId) {
  const count = tabCounts.get(tabId) || 0;
  browser.action.setBadgeText({ tabId, text: count ? String(count) : "" });
  browser.action.setBadgeBackgroundColor({ tabId, color: "#8a5a2b" });
}

browser.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab && sender.tab.id;

  if (message.type === "shouldRun") {
    // Decide by the tab's top-level site, so the per-site switch also covers iframes.
    const settings = await getSettings();
    const host = hostOf(sender.tab && sender.tab.url);
    return { run: settings.enabled && !settings.disabledSites.includes(host) };
  }

  if (message.type === "handled") {
    const { totalRejected } = await getSettings();
    await browser.storage.local.set({ totalRejected: totalRejected + 1 });
    if (tabId !== undefined) {
      tabCounts.set(tabId, (tabCounts.get(tabId) || 0) + 1);
      setBadge(tabId);
    }
    return { ok: true };
  }

  if (message.type === "getTabCount") {
    return { count: tabCounts.get(message.tabId) || 0 };
  }

  return undefined;
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabCounts.delete(tabId);
    setBadge(tabId);
  }
});

browser.tabs.onRemoved.addListener((tabId) => tabCounts.delete(tabId));

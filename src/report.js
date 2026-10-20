/*
 * Cookie Pookie — "Report broken site" link builder.
 * Shared by the popup and the Node tests, so it stays free of browser APIs.
 */

// Where reports go. Change this if the repository moves.
const COOKIE_POOKIE_ISSUES_URL = "https://github.com/BaguetteGod/cookie-pookie/issues/new";

/**
 * Builds a pre-filled GitHub issue link for a page where Cookie Pookie misbehaved.
 * Only the page's origin and path are included: query strings and fragments
 * often carry personal data (search terms, tokens), so they are dropped.
 */
function buildReportUrl({ pageUrl, results, addonVersion, engineVersion, userAgent }) {
  let page = "(unknown page)";
  let host = "unknown site";
  try {
    const url = new URL(pageUrl);
    page = url.origin + url.pathname;
    host = url.hostname;
  } catch {
    // keep the placeholders
  }

  const handled = results.length
    ? results.map(({ cmp, cosmetic }) => `- ${cmp} (${cosmetic ? "hidden" : "rejected"})`).join("\n")
    : "- nothing";

  const body = [
    `**Page:** ${page}`,
    "",
    "**What went wrong?** (tick one, add details below)",
    "- [ ] The cookie banner was still shown",
    "- [ ] Cookies were accepted instead of rejected",
    "- [ ] The page broke, froze or kept reloading",
    "- [ ] Something else",
    "",
    "**Details:**",
    "",
    "",
    "---",
    "**What Cookie Pookie handled on this page:**",
    handled,
    "",
    `Cookie Pookie ${addonVersion} · ${engineVersion}`,
    `Browser: ${userAgent}`
  ].join("\n");

  const params = new URLSearchParams({ title: `Broken site: ${host}`, body, labels: "broken-site" });
  return `${COOKIE_POOKIE_ISSUES_URL}?${params}`;
}

if (typeof module !== "undefined") module.exports = { buildReportUrl };

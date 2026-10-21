/*
 * Cookie Pookie — which cookies count as tracking cookies.
 *
 * Matched by name only: these are the analytics and advertising IDs that
 * tracking scripts store on the site's own domain, where Firefox's Total
 * Cookie Protection doesn't reach. Third-party tracker cookies are already
 * blocked or partitioned by Firefox, so there's no list of tracker domains.
 *
 * Left out on purpose, because deleting them changes what the user sees:
 * chat widgets (hubspotutk, intercom-*), A/B tests (Optimizely, VWO) and
 * newsletter popups (Klaviyo).
 */

const TRACKING_COOKIES = [
  // Google Analytics, Google Ads and Tag Manager
  /^_ga$/,
  /^_ga_[A-Z0-9]+$/,
  /^_gid$/,
  /^_gat(_.+)?$/,
  /^__utm[abctvz]$/,
  /^_gcl_[a-z]{2}$/,
  /^_dc_gtm_.+$/,
  // Meta Pixel
  /^_fbp$/,
  /^_fbc$/,
  // Microsoft Advertising and Clarity
  /^_uetsid$/,
  /^_uetvid$/,
  /^_clck$/,
  /^_clsk$/,
  // Hotjar (its opt-out cookie is protected below)
  /^_hj.+$/,
  // TikTok
  /^_ttp$/,
  /^_tt_enable_cookie$/,
  // Pinterest
  /^_pin_unauth$/,
  /^_pinterest_ct_ua$/,
  /^_epik$/,
  // Reddit
  /^_rdt_uuid$/,
  /^_rdt_cid$/,
  // Snapchat
  /^_scid(_r)?$/,
  /^_sctr$/,
  // LinkedIn and X click IDs
  /^li_fat_id$/,
  /^_twclid$/,
  // HubSpot analytics (not hubspotutk, which also keeps its chat going)
  /^__hstc$/,
  /^__hssc$/,
  /^__hssrc$/,
  // Matomo
  /^_pk_(id|ses|ref|cvar|hsr)(\..+)?$/,
  // Yandex Metrica
  /^_ym_.+$/,
  // Criteo
  /^cto_bundle$/,
  // Segment
  /^ajs_(anonymous|user)_id$/,
  // Mixpanel
  /^mp_[0-9a-f]{32}_mixpanel$/,
  // Amplitude, by its exact hex key format so Google AMP's AMP_* cookies don't match
  /^AMP_(MKTG_)?[0-9a-f]{10}$/,
  /^amp_[0-9a-f]{6}(_.+)?$/
];

// Never deleted, even if a pattern above matches. Consent cookies hold the
// "reject" Cookie Pookie just clicked (deleting them brings the banner back),
// opt-out cookies are the user's own choice, and security cookies keep CAPTCHAs away.
const PROTECTED_COOKIES = [
  // Consent platforms
  /^OptanonConsent$/,
  /^OptanonAlertBoxClosed$/,
  /^CookieConsent/,
  /^(eu|eupub)consent(-v2)?$/,
  /^addtl_consent$/,
  /^didomi_token$/,
  /^usprivacy$/,
  /^cookieyes-consent$/,
  /^uc_/,
  /^mtm_(cookie_)?consent/,
  // Opt-outs
  /^_hjOptOut$/,
  /opt_?out/i,
  // Bot and fraud protection (Cloudflare, Akamai, DataDome, PerimeterX)
  /^__cf_bm$/,
  /^cf_clearance$/,
  /^_cfuvid$/,
  /^_abck$/,
  /^bm_/,
  /^ak_bmsc$/,
  /^datadome$/,
  /^_px/
];

function isTrackingCookie(name) {
  return TRACKING_COOKIES.some((re) => re.test(name)) && !PROTECTED_COOKIES.some((re) => re.test(name));
}

// True if a and b are the same host or one is a subdomain of the other.
function hostsRelated(a, b) {
  return Boolean(a && b) && (a === b || a.endsWith("." + b) || b.endsWith("." + a));
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// The hosts a cookie belongs to: its own domain and, for cookies Firefox keeps
// apart per site, the site it was set on.
function cookieHosts(cookie) {
  return [cookie.domain.replace(/^\./, ""), cookie.firstPartyDomain, hostOf(cookie.partitionKey?.topLevelSite)].filter(Boolean);
}

// The URL cookies.remove() needs to find the cookie. https also matches cookies without the Secure flag.
function cookieUrl(cookie) {
  return `https://${cookie.domain.replace(/^\./, "")}${cookie.path}`;
}

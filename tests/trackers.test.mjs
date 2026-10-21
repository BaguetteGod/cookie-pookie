// Tests for the tracking cookie list in src/trackers.js. Usage: node tests/trackers.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(root, "src/trackers.js"), "utf8"), context, { filename: "src/trackers.js" });
const { isTrackingCookie, hostsRelated, cookieHosts, cookieUrl } = context;

const tracking = [
  "_ga",
  "_ga_ABC123XYZ",
  "_gid",
  "_gat",
  "_gat_UA-1234-1",
  "_gat_gtag_UA_1234_1",
  "__utma",
  "__utmz",
  "_gcl_au",
  "_gcl_aw",
  "_dc_gtm_UA-1234-1",
  "_fbp",
  "_fbc",
  "_uetsid",
  "_uetvid",
  "_clck",
  "_clsk",
  "_hjid",
  "_hjSessionUser_123456",
  "_hjSession_123456",
  "_ttp",
  "_pin_unauth",
  "_rdt_uuid",
  "_scid",
  "li_fat_id",
  "__hstc",
  "__hssc",
  "_pk_id.1.1fff",
  "_pk_ses.1.1fff",
  "_ym_uid",
  "_ym_d",
  "cto_bundle",
  "ajs_anonymous_id",
  "mp_0123456789abcdef0123456789abcdef_mixpanel",
  "AMP_0123456789",
  "AMP_MKTG_0123456789",
  "amp_a1b2c3"
];

const kept = [
  // Sessions, logins, carts and preferences
  "PHPSESSID",
  "JSESSIONID",
  "sessionid",
  "csrftoken",
  "cart",
  "lang",
  "_session_id",
  // Consent: deleting it would bring the banner back
  "OptanonConsent",
  "OptanonAlertBoxClosed",
  "CookieConsent",
  "euconsent-v2",
  "addtl_consent",
  "didomi_token",
  "usprivacy",
  "cookieyes-consent",
  "uc_settings",
  "mtm_consent",
  // Opt-outs
  "_hjOptOut",
  // Bot protection: deleting it means more CAPTCHAs
  "__cf_bm",
  "cf_clearance",
  "_cfuvid",
  "_abck",
  "bm_sz",
  "ak_bmsc",
  "datadome",
  "_px3",
  // Chat, A/B tests and popups: deleting these changes what the user sees
  "hubspotutk",
  "intercom-id-abc123",
  "_vis_opt_s",
  "optimizelyEndUserId",
  "__kla_id",
  // Google AMP pages, not Amplitude
  "AMP_TOKEN",
  "AMP_ECID_GOOGLE",
  // Look-alikes
  "_gaq",
  "ga",
  "gid",
  "_galaxy"
];

for (const name of tracking) assert.ok(isTrackingCookie(name), `${name} should be a tracking cookie`);
console.log(`ok - ${tracking.length} tracking cookies match`);

for (const name of kept) assert.ok(!isTrackingCookie(name), `${name} should be kept`);
console.log(`ok - ${kept.length} other cookies are kept`);

assert.ok(hostsRelated("www.shop.example", "shop.example"));
assert.ok(hostsRelated("shop.example", "www.shop.example"));
assert.ok(!hostsRelated("myshop.example", "shop.example"));
assert.ok(!hostsRelated("", "shop.example"));
console.log("ok - hosts are related only as the same site or subdomains");

assert.deepEqual(
  [...cookieHosts({ domain: ".cdn.example", firstPartyDomain: "", partitionKey: { topLevelSite: "https://shop.example" } })],
  ["cdn.example", "shop.example"]
);
assert.deepEqual([...cookieHosts({ domain: "shop.example", firstPartyDomain: "", partitionKey: null })], ["shop.example"]);
assert.equal(cookieUrl({ domain: ".shop.example", path: "/account" }), "https://shop.example/account");
console.log("ok - cookie hosts and removal URL");

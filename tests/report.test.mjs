// Tests for the "Report broken site" link. Usage: node tests/report.test.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildReportUrl } = require("../src/report.js");

const base = {
  results: [
    { cmp: "Onetrust", cosmetic: false },
    { cmp: "some-banner", cosmetic: true }
  ],
  addonVersion: "0.3.0",
  engineVersion: "autoconsent 16.57.0",
  userAgent: "Mozilla/5.0 Firefox/140.0"
};

const read = (link) => {
  const url = new URL(link);
  return { url, title: url.searchParams.get("title"), body: url.searchParams.get("body") };
};

{
  const { url, title, body } = read(
    buildReportUrl({ ...base, pageUrl: "https://shop.example.com/cart?session=SECRET123&q=private#pay" })
  );
  assert.equal(url.origin + url.pathname, "https://github.com/BaguetteGod/cookie-pookie/issues/new");
  assert.equal(title, "Broken site: shop.example.com");
  assert.equal(url.searchParams.get("labels"), "broken-site");
  assert.match(body, /\*\*Page:\*\* https:\/\/shop\.example\.com\/cart\n/);
  assert.ok(!link_contains(url.href, "SECRET123"), "query string must be dropped");
  assert.ok(!body.includes("private") && !body.includes("#pay"), "query and fragment must be dropped");
  assert.match(body, /- Onetrust \(rejected\)/);
  assert.match(body, /- some-banner \(hidden\)/);
  assert.match(body, /Cookie Pookie 0\.3\.0 · autoconsent 16\.57\.0/);
  assert.match(body, /Browser: Mozilla\/5\.0 Firefox\/140\.0/);
  console.log("ok - report link has site, findings and versions but no query string");
}

{
  const { body } = read(buildReportUrl({ ...base, results: [], pageUrl: "https://a.example/" }));
  assert.match(body, /- nothing/);
  console.log("ok - report link says when nothing was handled");
}

{
  const { title, body } = read(buildReportUrl({ ...base, pageUrl: "not a url" }));
  assert.equal(title, "Broken site: unknown site");
  assert.match(body, /\(unknown page\)/);
  console.log("ok - report link survives a bad page URL");
}

function link_contains(href, text) {
  return decodeURIComponent(href).includes(text);
}

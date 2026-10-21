// Updates the addons.mozilla.org listing (summary, description and privacy
// policy, in every language) from docs/amo-listing.md.
//
//   node scripts/amo-listing.mjs --dry-run   # show what would be sent
//   AMO_JWT_ISSUER=... AMO_JWT_SECRET=... node scripts/amo-listing.mjs
//
// Languages left out of docs/amo-listing.md keep their current text on AMO.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { API, amoRequest } from "./amo-api.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIELDS = { Summary: "summary", Description: "description", "Privacy policy": "privacy_policy" };

// Each "## Language (locale)" section holds "**Field**" headings, each followed by a ```text block.
function parseListing(markdown) {
  const listing = { summary: {}, description: {}, privacy_policy: {} };
  for (const section of markdown.split(/^## /m).slice(1)) {
    const locale = section.match(/^.*\(([A-Za-z-]+)\)\s*$/m)?.[1];
    if (!locale) throw new Error(`No (locale) in the heading "## ${section.split("\n")[0]}"`);
    for (const [, label, text] of section.matchAll(/^\*\*(.+?)\*\*\s*\n+```text\n([\s\S]*?)\n```/gm)) {
      const field = FIELDS[label];
      if (!field) throw new Error(`Unknown field "${label}" for ${locale}`);
      listing[field][locale] = text;
    }
    for (const [label, field] of Object.entries(FIELDS)) {
      if (!listing[field][locale]) throw new Error(`${locale} has no ${label}`);
    }
    if (listing.summary[locale].length > 250) throw new Error(`${locale} summary is over 250 characters`);
  }
  return listing;
}

function patch(url, body) {
  return amoRequest("PATCH", url, { issuer: process.env.AMO_JWT_ISSUER, secret: process.env.AMO_JWT_SECRET, makeBody: () => body });
}

const listing = parseListing(fs.readFileSync(path.join(root, "docs/amo-listing.md"), "utf8"));
const id = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).browser_specific_settings.gecko.id;
const details = { summary: listing.summary, description: listing.description };
const policy = { privacy_policy: listing.privacy_policy };

if (process.argv.includes("--dry-run")) {
  console.log(`Would update ${id} in ${Object.keys(listing.summary).join(", ")}:`);
  console.log(JSON.stringify({ ...details, ...policy }, null, 2));
  process.exit(0);
}
if (!process.env.AMO_JWT_ISSUER || !process.env.AMO_JWT_SECRET) {
  console.error("Set AMO_JWT_ISSUER and AMO_JWT_SECRET, or use --dry-run.");
  process.exit(1);
}

const addon = `${API}/${encodeURIComponent(id)}/`;
await patch(addon, details);
await patch(`${addon}eula_policy/`, policy);
console.log(`Updated the listing of ${id} in ${Object.keys(listing.summary).join(", ")}.`);

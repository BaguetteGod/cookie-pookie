// Prints the addons.mozilla.org metadata for a release as JSON, for
// `web-ext sign --amo-metadata`: the release notes from CHANGELOG.md and the
// notes that tell reviewers how to reproduce vendor/autoconsent/.
//
//   node scripts/amo-metadata.mjs 0.4.0 > amo-metadata.json
//   node scripts/amo-metadata.mjs 0.4.0 --notes   # just the release notes, as Markdown
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [version, flag] = process.argv.slice(2);
if (!version) {
  console.error("usage: node scripts/amo-metadata.mjs <version> [--notes]");
  process.exit(1);
}

function changelogSection(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return null;
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  const body = lines.slice(start + 1, end === -1 ? undefined : end).join("\n").trim();
  return body || null;
}

const notes = changelogSection(fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8"), version);
if (!notes) {
  console.error(`CHANGELOG.md has no "## ${version}" section with release notes.`);
  process.exit(1);
}
if (flag === "--notes") {
  console.log(notes);
  process.exit(0);
}

const vendored = fs.readFileSync(path.join(root, "vendor/autoconsent/VERSION"), "utf8");
const autoconsent = vendored.match(/^autoconsent (\S+)/m)?.[1];
const esbuild = vendored.match(/^esbuild (\S+)/m)?.[1];

const approvalNotes = `vendor/autoconsent/ is DuckDuckGo's autoconsent ${autoconsent} (MPL-2.0), built from the published npm package @duckduckgo/autoconsent@${autoconsent}. To reproduce it byte for byte from the attached source (Node 22 or newer with npm):

npm ci --ignore-scripts && scripts/build-autoconsent.sh

The script downloads that exact package version (its integrity hash is recorded in vendor/autoconsent/VERSION), copies its prebuilt rules, and bundles its TypeScript sources with esbuild ${esbuild}, pinned in package-lock.json. All other files are hand-written and unbundled.

Repository: https://github.com/BaguetteGod/cookie-pookie`;

console.log(JSON.stringify({ version: { release_notes: { "en-US": notes }, approval_notes: approvalNotes } }, null, 2));

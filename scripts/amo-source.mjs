// Finishes a submission that `web-ext sign` left half done: if the version is
// already on addons.mozilla.org, uploads its source code unless it has some.
// The Release workflow runs this when `web-ext sign` fails, because web-ext
// can't be re-run once the version exists (AMO rejects the same version twice).
//
//   WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... node scripts/amo-source.mjs 0.5.0 source.zip
//
// Exits 0 when the version is on AMO with its source code, 2 when the version
// isn't on AMO (so submitting it again is safe), 1 on any other error.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { API, amoRequest } from "./amo-api.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [version, sourcePath] = process.argv.slice(2);
if (!version || !sourcePath) {
  console.error("usage: node scripts/amo-source.mjs <version> <source.zip>");
  process.exit(1);
}
const auth = { issuer: process.env.WEB_EXT_API_KEY, secret: process.env.WEB_EXT_API_SECRET };
if (!auth.issuer || !auth.secret) {
  console.error("Set WEB_EXT_API_KEY and WEB_EXT_API_SECRET.");
  process.exit(1);
}

const id = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).browser_specific_settings.gecko.id;
const versions = `${API}/${encodeURIComponent(id)}/versions/`;

// Versions awaiting review only show up with a filter, which needs the owner's credentials.
async function findVersion() {
  let url = `${versions}?filter=all_with_unlisted&page_size=50`;
  while (url) {
    const page = await amoRequest("GET", url, auth);
    const found = page.results.find((v) => v.version === version);
    if (found) return found;
    url = page.next;
  }
  return null;
}

try {
  const found = await findVersion();
  if (!found) {
    console.log(`Version ${version} isn't on addons.mozilla.org.`);
    process.exit(2);
  }
  const detail = await amoRequest("GET", `${versions}${found.id}/`, auth);
  if (detail.source) {
    console.log(`Version ${version} is on addons.mozilla.org with its source code.`);
    process.exit(0);
  }
  console.log(`Version ${version} is on addons.mozilla.org without source code; uploading ${sourcePath}.`);
  const data = fs.readFileSync(sourcePath);
  await amoRequest("PATCH", `${versions}${found.id}/`, {
    ...auth,
    makeBody: () => {
      const form = new FormData();
      form.set("source", new File([data], path.basename(sourcePath)));
      return form;
    }
  });
  console.log(`Uploaded the source code of ${version}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

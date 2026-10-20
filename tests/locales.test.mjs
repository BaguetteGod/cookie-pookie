// Tests for the translations in _locales/. Usage: node tests/locales.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const messages = (lang) => JSON.parse(read(`_locales/${lang}/messages.json`));

const english = messages("en");
const languages = fs.readdirSync(path.join(root, "_locales")).filter((lang) => lang !== "en");
// Placeholders a message uses, like ["CMP"] for "Rejected cookies on the $CMP$ banner."
const used = (text) => [...text.matchAll(/\$([A-Za-z0-9_@]+)\$/g)].map((m) => m[1].toLowerCase()).sort();
// Plural forms like total_few are optional: languages add the ones their plural rules need.
const isPluralForm = (key) => /_(zero|one|two|few|many)$/.test(key);

{
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.default_locale, "en");
  for (const [field, value] of Object.entries(manifest)) {
    const key = typeof value === "string" && value.match(/^__MSG_(\w+)__$/)?.[1];
    if (key) assert.ok(english[key], `manifest ${field} uses missing message ${key}`);
  }
  console.log("ok - manifest messages exist in English");
}

{
  const html = read("src/popup/popup.html") + read("src/options/options.html");
  const js = read("src/popup/popup.js") + read("src/options/options.js");
  // data-i18n="key" in the HTML, t("key", ...) in the scripts, plus the two keys
  // the script picks between and the total_<plural form> messages.
  const keys = [
    ...[...html.matchAll(/data-i18n="(\w+)"/g)].map((m) => m[1]),
    ...[...js.matchAll(/\bt\("(\w+)"/g)].map((m) => m[1]),
    "statusHidden",
    "statusRejected",
    "total_one",
    "total_other"
  ];
  assert.ok(js.includes('"statusHidden" : "statusRejected"') && js.includes("`total_${"), "update this test's key list");
  for (const key of keys) assert.ok(english[key], `popup uses missing message ${key}`);
  console.log(`ok - all ${new Set(keys).size} messages the popup and options page use exist in English`);
}

for (const [key, { message, placeholders = {} }] of Object.entries(english)) {
  assert.deepEqual(used(message), Object.keys(placeholders).sort(), `en ${key}: placeholders don't match the message`);
}
console.log("ok - English placeholders are all defined and used");

for (const lang of languages) {
  const translated = messages(lang);
  for (const key of Object.keys(english)) {
    if (isPluralForm(key) && key !== "total_one") continue;
    assert.ok(translated[key]?.message, `${lang} is missing ${key}`);
  }
  for (const [key, { message, placeholders = {} }] of Object.entries(translated)) {
    const base = english[key] ?? english[key.replace(/_(zero|one|two|few|many)$/, "_other")];
    assert.ok(base, `${lang} has ${key}, which English doesn't`);
    assert.deepEqual(used(message), used(base.message), `${lang} ${key}: uses different placeholders than English`);
    assert.deepEqual(placeholders, base.placeholders ?? {}, `${lang} ${key}: placeholder definitions differ from English`);
  }
  console.log(`ok - ${lang} has every message with the same placeholders as English`);
}

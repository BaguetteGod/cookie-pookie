// Runs the background scripts in Node with a fake `browser` API and checks the
// message protocol the autoconsent engine relies on.
// Usage: node tests/background.test.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

function makeBrowser() {
  const storage = {};
  const sent = [];
  const badges = {};
  const executed = [];
  let onMessage = null;
  const browser = {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const k of Array.isArray(keys) ? keys : Object.keys(keys)) if (k in storage) out[k] = storage[k];
          return out;
        },
        async set(obj) {
          Object.assign(storage, obj);
        }
      }
    },
    runtime: {
      getURL: (p) => "file://" + path.join(root, p),
      onMessage: { addListener: (fn) => (onMessage = fn) }
    },
    tabs: {
      async sendMessage(tabId, message, options) {
        sent.push({ tabId, message, frameId: options && options.frameId });
      },
      onUpdated: { addListener() {} },
      onRemoved: { addListener() {} }
    },
    action: {
      setBadgeText: ({ tabId, text }) => (badges[tabId] = text),
      setBadgeBackgroundColor() {}
    },
    scripting: {
      async executeScript(details) {
        executed.push(details);
        return [{ result: true }];
      }
    }
  };
  return { browser, storage, sent, badges, executed, send: (m, s) => onMessage(m, s) };
}

function loadBackground(fake) {
  const context = vm.createContext({
    browser: fake.browser,
    console,
    URL,
    fetch: async (url) => ({ json: async () => JSON.parse(fs.readFileSync(fileURLToPath(url), "utf8")) })
  });
  context.globalThis = context;
  for (const file of manifest.background.scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context;
}

const tick = () => new Promise((r) => setTimeout(r, 50));
const tab = (url, id = 7) => ({ id, url });
let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log("ok -", name);
}

await test("vendored libraries expose what Cookie Pookie needs", async () => {
  const ctx = loadBackground(makeBrowser());
  assert.equal(typeof ctx.CookiePookieAutoConsentLib.filterCompactRules, "function");
  assert.ok(Object.keys(ctx.CookiePookieAutoConsentLib.snippets).length > 50, "expected many eval snippets");

  const contentCtx = vm.createContext({});
  contentCtx.globalThis = contentCtx;
  vm.runInContext(fs.readFileSync(path.join(root, "vendor/autoconsent/content-lib.js"), "utf8"), contentCtx);
  assert.equal(typeof contentCtx.CookiePookieAutoConsent, "function");
});

await test("init sends rules and an opt-out-only config", async () => {
  const fake = makeBrowser();
  loadBackground(fake);
  fake.send({ type: "init", url: "https://www.example.org/" }, { tab: tab("https://www.example.org/"), frameId: 0, url: "https://www.example.org/" });
  await tick();
  const resp = fake.sent.find((s) => s.message.type === "initResp");
  assert.ok(resp, "no initResp sent");
  assert.equal(resp.frameId, 0);
  assert.equal(resp.message.config.enabled, true);
  assert.equal(resp.message.config.autoAction, "optOut");
  assert.equal(resp.message.config.heuristicMode, "reject");
  assert.ok(resp.message.rules.compact.r.length > 10, "expected generic rules for the main frame");
});

await test("site-specific rules are included for matching sites", async () => {
  const fake = makeBrowser();
  const ctx = loadBackground(fake);
  const all = JSON.parse(fs.readFileSync(path.join(root, "vendor/autoconsent/compact-rules.json"), "utf8"));
  const generic = ctx.CookiePookieAutoConsentLib.filterCompactRules(all, { url: "https://www.example.org/", mainFrame: true });
  // Find any URL-specific rule and check it is picked up on a matching URL.
  const lib = ctx.CookiePookieAutoConsentLib;
  let checked = false;
  for (const host of ["www.google.com", "www.youtube.com", "www.reddit.com", "www.bbc.co.uk", "www.amazon.de"]) {
    const specific = lib.filterCompactRules(all, { url: `https://${host}/`, mainFrame: true });
    if (specific.r.length > generic.r.length) {
      checked = true;
      break;
    }
  }
  assert.ok(checked, "no site-specific rule matched any test site");
});

await test("iframes get frame rules, decided by the tab's site", async () => {
  const fake = makeBrowser();
  loadBackground(fake);
  fake.send({ type: "init" }, { tab: tab("https://news.example.com/"), frameId: 3, url: "https://cmp.example.net/frame" });
  await tick();
  const resp = fake.sent.find((s) => s.message.type === "initResp");
  assert.equal(resp.frameId, 3);
  assert.equal(resp.message.config.enabled, true);
});

await test("per-site and global switches disable the engine", async () => {
  const fake = makeBrowser();
  loadBackground(fake);
  fake.storage.disabledSites = ["news.example.com"];
  fake.send({ type: "init" }, { tab: tab("https://news.example.com/"), frameId: 2, url: "https://cmp.example.net/frame" });
  await tick();
  assert.equal(fake.sent.at(-1).message.config.enabled, false, "iframe on disabled site should be off");

  fake.storage.disabledSites = [];
  fake.storage.enabled = false;
  fake.send({ type: "init" }, { tab: tab("https://other.example.com/"), frameId: 0, url: "https://other.example.com/" });
  await tick();
  assert.equal(fake.sent.at(-1).message.config.enabled, false, "global switch should turn it off");
});

await test("eval runs the named snippet in the page's main world", async () => {
  const fake = makeBrowser();
  const ctx = loadBackground(fake);
  const snippetId = Object.keys(ctx.CookiePookieAutoConsentLib.snippets)[0];
  fake.send({ type: "eval", id: "abc", code: "", snippetId }, { tab: tab("https://a.example/"), frameId: 4 });
  await tick();
  assert.equal(fake.executed.length, 1);
  assert.equal(fake.executed[0].world, "MAIN");
  assert.equal(JSON.stringify(fake.executed[0].target), JSON.stringify({ tabId: 7, frameIds: [4] }));
  const resp = fake.sent.find((s) => s.message.type === "evalResp");
  assert.deepEqual({ ...resp.message, frameId: resp.frameId }, { id: "abc", type: "evalResp", result: true, frameId: 4 });
});

await test("unknown snippets are never executed", async () => {
  const fake = makeBrowser();
  loadBackground(fake);
  fake.send({ type: "eval", id: "x", code: "alert(1)", snippetId: "not-a-snippet" }, { tab: tab("https://a.example/"), frameId: 0 });
  await tick();
  assert.equal(fake.executed.length, 0);
  assert.equal(fake.sent.at(-1).message.result, false);
});

await test("handled banners update the badge, popup data and total", async () => {
  const fake = makeBrowser();
  loadBackground(fake);
  fake.send({ type: "autoconsentDone", cmp: "Onetrust", isCosmetic: false }, { tab: tab("https://a.example/"), frameId: 0 });
  fake.send({ type: "autoconsentDone", cmp: "some-banner", isCosmetic: true }, { tab: tab("https://a.example/"), frameId: 1 });
  await tick();
  assert.equal(fake.badges[7], "2");
  const { results } = await fake.send({ type: "getTabResults", tabId: 7 }, {});
  assert.deepEqual(JSON.parse(JSON.stringify(results)), [
    { cmp: "Onetrust", cosmetic: false },
    { cmp: "some-banner", cosmetic: true }
  ]);
  assert.ok(fake.storage.totalHandled >= 1);
});

console.log(`\n${passed} tests passed`);

// End-to-end tests: real Firefox with Cookie Pookie installed, visiting local
// test pages with sample cookie banners.
//
//   npm install
//   npx puppeteer browsers install firefox@stable
//   npm run test:e2e
//
// Set HEADLESS=false to watch it run.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = path.join(here, "fixtures");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript" };

function startServer() {
  const server = http.createServer((req, res) => {
    const name = path.basename(new URL(req.url, "http://x").pathname) || "index.html";
    const file = path.join(fixtures, name);
    if (!file.startsWith(fixtures) || !fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "text/plain" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Waits until the page records a click, or the timeout passes. Returns the clicks.
async function clicksIn(frame, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const clicked = await frame.evaluate(() => document.documentElement.dataset.clicked || "");
    if (clicked) return clicked;
    await new Promise((r) => setTimeout(r, 250));
  }
  return "";
}

// A copy of the add-on with tests/e2e/probe.js loaded before the other
// content scripts, so pages show which rule handled their banner.
function testCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cookie-pookie-e2e-"));
  for (const entry of ["manifest.json", "_locales", "icons", "src", "vendor"]) {
    fs.cpSync(path.join(root, entry), path.join(dir, entry), { recursive: true });
  }
  fs.copyFileSync(path.join(here, "probe.js"), path.join(dir, "e2e-probe.js"));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  manifest.content_scripts[0].js.unshift("e2e-probe.js");
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Waits for the engine to report the rules that handled banners in `frame`; "" if none in time.
async function handledBy(frame, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rules = await frame.evaluate(() => document.documentElement.dataset.handledBy || "");
    if (rules) return rules;
    await new Promise((r) => setTimeout(r, 250));
  }
  return "";
}

// Waits up to 10 s for a frame whose URL ends with `suffix`.
async function frameEndingWith(page, suffix) {
  for (let i = 0; i < 40; i++) {
    const frame = page.frames().find((f) => f.url().endsWith(suffix));
    if (frame) return frame;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`iframe ${suffix} did not load`);
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await launch();

async function launch() {
  try {
    return await puppeteer.launch({
      browser: "firefox",
      headless: process.env.HEADLESS !== "false",
      extraPrefsFirefox: {
        // Grant the add-on's host permissions without a prompt (the default on desktop).
        "extensions.originControls.grantByDefault": true
      }
    });
  } catch (error) {
    annotate("e2e: could not start Firefox", error.stack || error.message);
    throw error;
  }
}

// On GitHub Actions, also report failures as annotations so they show up on the PR.
function annotate(title, message) {
  if (!process.env.GITHUB_ACTIONS) return;
  const esc = (t) => String(t).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  console.log(`::error title=${esc(title).replace(/[:,]/g, " ")}::${esc(message)}`);
}

process.on("unhandledRejection", (error) => {
  annotate("e2e run crashed", error && error.stack ? error.stack : error);
  console.error(error);
  process.exit(1);
});

let failures = 0;
const passed = [];
async function test(name, fn) {
  const page = await browser.newPage();
  try {
    await fn(page);
    console.log(`ok - ${name}`);
    passed.push(name);
  } catch (error) {
    failures++;
    console.log(`not ok - ${name}\n  ${String(error.message).replace(/\n/g, "\n  ")}`);
    annotate(`e2e: ${name}`, error.message);
  } finally {
    await page.close();
  }
}

try {
  let id;
  try {
    id = await browser.installExtension(testCopy());
  } catch (error) {
    annotate("e2e: could not install the add-on", error.stack || error.message);
    throw error;
  }
  console.log(`# installed Cookie Pookie as ${id}`);

  // Test pages modelled on the big consent platforms: [name, page, the engine's rule for it,
  // banner selector]. Checking the rule makes sure the platform's own rule did the work,
  // not the generic heuristics, which would also click a "Reject all" button.
  const platforms = [
    ["OneTrust", "onetrust.html", "Onetrust", "#onetrust-banner-sdk"],
    ["Cookiebot", "cookiebot.html", "Cybotcookiebot", "#CybotCookiebotDialog"],
    ["Didomi", "didomi.html", "didomi", "#didomi-notice"],
    ["Quantcast (IAB TCF)", "quantcast.html", "quantcast", "#qc-cmp2-ui"],
    ["CookieYes", "cookieyes.html", "cookieyes", ".cky-consent-container"],
    ["Usercentrics", "usercentrics.html", "usercentrics-api", null] // its banner lives in a shadow root
  ];
  for (const [name, file, rule, banner] of platforms) {
    await test(`rejects a ${name} banner`, async (page) => {
      await page.goto(`${base}/${file}`);
      assert.equal(await clicksIn(page.mainFrame(), 15000), "reject");
      assert.equal(await handledBy(page.mainFrame()), rule);
      if (banner) assert.equal(await page.$(banner), null, "banner should be gone");
    });
  }

  await test("rejects a Sourcepoint banner in its iframe and hides the container", async (page) => {
    await page.goto(`${base}/sourcepoint.html`);
    const frame = await frameEndingWith(page, "/index.html?message_id=1234");
    assert.equal(await clicksIn(frame, 15000), "reject");
    assert.equal(await handledBy(frame), "Sourcepoint-frame");
    assert.equal(await handledBy(page.mainFrame()), "sourcepoint-top");
    const hidden = await page.$eval("#sp_message_container_1234", (el) => getComputedStyle(el).visibility === "hidden");
    assert.ok(hidden, "the Sourcepoint container should be hidden");
  });

  await test("rejects a banner from an unknown platform using heuristics", async (page) => {
    await page.goto(`${base}/generic.html`);
    assert.equal(await clicksIn(page.mainFrame(), 15000), "reject");
    assert.equal(await handledBy(page.mainFrame()), "HEURISTIC-REJECT");
  });

  await test("rejects a banner inside an iframe", async (page) => {
    await page.goto(`${base}/iframe.html`);
    const frame = await frameEndingWith(page, "/iframe-banner.html");
    assert.equal(await clicksIn(frame, 15000), "reject");
    assert.equal(await handledBy(frame), "piano.io");
  });

  for (const start of ["hidden", "tiny"]) {
    await test(`rejects a banner in an iframe that starts ${start} and is shown later`, async (page) => {
      await page.goto(`${base}/iframe-later.html?start=${start}`);
      const frame = await frameEndingWith(page, "/iframe-banner.html?later");
      assert.equal(await clicksIn(frame, 15000), "reject");
      assert.equal(await handledBy(frame), "piano.io");
    });
  }

  await test("never clicks accept when there is no reject option", async (page) => {
    await page.goto(`${base}/accept-only.html`);
    const clicked = await clicksIn(page.mainFrame(), 8000);
    assert.ok(!clicked.includes("accept"), `clicked: ${clicked}`);
  });
} finally {
  await browser.close();
  server.close();
}

if (process.env.GITHUB_ACTIONS && passed.length) {
  console.log(`::notice title=e2e passed::${passed.join("%0A")}`);
}

if (failures) {
  console.log(`\n${failures} e2e test(s) failed`);
  process.exit(1);
}
console.log("\nall e2e tests passed");

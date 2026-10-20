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
    id = await browser.installExtension(root);
  } catch (error) {
    annotate("e2e: could not install the add-on", error.stack || error.message);
    throw error;
  }
  console.log(`# installed Cookie Pookie as ${id}`);

  await test("rejects a OneTrust banner", async (page) => {
    await page.goto(`${base}/onetrust.html`);
    assert.equal(await clicksIn(page.mainFrame(), 15000), "reject");
    assert.equal(await page.$("#onetrust-banner-sdk"), null, "banner should be gone");
  });

  await test("rejects a banner from an unknown platform using heuristics", async (page) => {
    await page.goto(`${base}/generic.html`);
    assert.equal(await clicksIn(page.mainFrame(), 15000), "reject");
  });

  await test("rejects a banner inside an iframe", async (page) => {
    await page.goto(`${base}/iframe.html`);
    let frame = null;
    for (let i = 0; i < 40 && !frame; i++) {
      frame = page.frames().find((f) => f.url().endsWith("/iframe-banner.html"));
      if (!frame) await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(frame, "iframe did not load");
    assert.equal(await clicksIn(frame, 15000), "reject");
  });

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

// Performance check: how much does Cookie Pookie slow pages down?
//
//   npm run perf                       # 40 rounds per page
//   ROUNDS=80 npm run perf             # more rounds, steadier numbers
//   PAGES=iframes npm run perf         # only pages whose file name contains "iframes"
//   ADDON=/path/to/copy npm run perf   # measure a modified copy of the add-on
//   FIREFOX=/path/to/firefox npm run perf
//
// Compares Firefox with the add-on against Firefox with a copy of the add-on
// that has no content script: both carry the same extension overhead, so the
// difference is what Cookie Pookie does inside pages. The pages time and report
// themselves (tests/perf/driver.js) and move on by themselves, because browser
// automation adds per-frame overhead that would inflate the numbers. Runs
// alternate between the two, and the first rounds of each run are dropped as
// warm-up. Local pages keep the network out of it; on real sites, which load
// slower, the add-on's share is smaller.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webExt from "web-ext";
import { consoleStream } from "web-ext/util/logger";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const dirs = [path.join(here, "pages"), path.join(root, "tests/e2e/fixtures")];
const ROUNDS = Number(process.env.ROUNDS || 40);
const CYCLES = 2; // each variant runs this many times, alternating
const WARMUP = 3; // rounds dropped at the start of each page in each run
const ADDON = process.env.ADDON ? path.resolve(process.env.ADDON) : root;
const FIREFOX = process.env.FIREFOX || "firefox";
if (process.env.HEADLESS !== "false") process.env.MOZ_HEADLESS = "1";

// [name, file, value to wait for when the add-on is installed]
const allPages = [
  ["Article, no banner", "plain.html"],
  ["20 iframes, same site", "iframes.html"],
  ["20 iframes from other sites", "iframes-cross-site.html"],
  ["4 visible and 16 hidden iframes", "iframes-mixed.html"],
  ["Large page that keeps changing", "busy.html", "updateMs"],
  ["OneTrust banner", "onetrust.html", "clickedAt"]
];
const only = process.env.PAGES ? process.env.PAGES.split(",") : null;
const pages = allPages.filter(([, file]) => !only || only.some((s) => file.includes(s)));
const perRun = Math.ceil(ROUNDS / CYCLES);

// The baseline: the same add-on without its content script.
function baselineCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cookie-pookie-perf-"));
  for (const entry of ["manifest.json", "_locales", "icons", "src", "vendor"]) {
    fs.cpSync(path.join(ADDON, entry), path.join(dir, entry), { recursive: true });
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  delete manifest.content_scripts;
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const results = {}; // results[variant][page] = [{ metric: ms }]
let finishRun = null;

const url = (variant, page, i) => {
  const [, file, wait] = pages[page];
  const params = new URLSearchParams({ run: variant, page, i });
  if (wait && (variant === "with" || wait === "updateMs")) params.set("wait", wait);
  return `/${file}?${params}`;
};

const driver = fs.readFileSync(path.join(here, "driver.js"), "utf8");
const server = http.createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url, "http://x");
  const variant = searchParams.get("run");
  const page = Number(searchParams.get("page"));
  const i = Number(searchParams.get("i"));

  if (pathname === "/report") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (i >= WARMUP) ((results[variant] ??= {})[page] ??= []).push(JSON.parse(body));
      res.writeHead(204).end();
    });
    return;
  }
  if (pathname === "/next") {
    const next = i + 1 < WARMUP + perRun ? url(variant, page, i + 1) : page + 1 < pages.length ? url(variant, page + 1, 0) : null;
    if (!next) {
      res.writeHead(200, { "content-type": "text/plain" }).end("done");
      finishRun?.();
      return;
    }
    res.writeHead(302, { location: next }).end();
    return;
  }

  const file = dirs.map((dir) => path.join(dir, path.basename(pathname))).find((f) => fs.existsSync(f));
  if (!file) return res.writeHead(404).end("not found");
  const html = file.endsWith(".html");
  res.writeHead(200, { "content-type": html ? "text/html; charset=utf-8" : "text/javascript", "cache-control": "no-store" });
  const text = fs.readFileSync(file, "utf8");
  res.end(html ? text.replace("</body>", `<script>${driver}</script></body>`) : text);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

async function runVariant(variant, sourceDir) {
  const done = new Promise((resolve, reject) => {
    finishRun = resolve;
    setTimeout(() => reject(new Error(`${variant} run timed out`)), 15 * 60 * 1000).unref();
  });
  const runner = await webExt.cmd.run(
    { sourceDir, firefox: FIREFOX, startUrl: [`${base}${url(variant, 0, 0)}`], noReload: true, noInput: true },
    { shouldExitProgram: false }
  );
  try {
    await done;
  } finally {
    await runner.exit();
  }
}

const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(q * values.length))];
const ms = (v) => `${v.toFixed(1)} ms`;

// Hold back web-ext's "Installed ... as a temporary add-on" messages; shown only if something fails.
consoleStream.startCapturing();
try {
  const baseline = baselineCopy();
  console.log(`# ${perRun * CYCLES} rounds per page in ${CYCLES} alternating runs, plus ${WARMUP} warm-up rounds per run\n`);
  for (let cycle = 0; cycle < CYCLES; cycle++) {
    for (const variant of cycle % 2 ? ["with", "without"] : ["without", "with"]) {
      await runVariant(variant, variant === "with" ? ADDON : baseline);
    }
  }

  pages.forEach(([name], page) => {
    const [a, b] = [results.with[page], results.without[page]];
    console.log(`${name}  (${a.length} rounds)`);
    for (const metric of Object.keys(a[0])) {
      const withAddon = a.map((r) => r[metric]);
      if (!b.every((r) => metric in r)) {
        console.log(`  ${metric.padEnd(22)} median ${ms(quantile(withAddon, 0.5))}, p90 ${ms(quantile(withAddon, 0.9))}`);
        continue;
      }
      const without = b.map((r) => r[metric]);
      const [mb, ma] = [quantile(without, 0.5), quantile(withAddon, 0.5)];
      const diff = ma - mb;
      console.log(
        `  ${metric.padEnd(22)} without ${ms(mb).padStart(9)}   with ${ms(ma).padStart(9)}   ` +
          `difference ${(diff >= 0 ? "+" : "") + diff.toFixed(1)} ms (${((diff / mb) * 100).toFixed(0)}%)   ` +
          `p90 ${ms(quantile(without, 0.9))} → ${ms(quantile(withAddon, 0.9))}`
      );
    }
    console.log("");
  });
} catch (error) {
  consoleStream.flushCapturedLogs();
  throw error;
} finally {
  consoleStream.stopCapturing();
  server.close();
}

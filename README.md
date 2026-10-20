# Cookie Pookie 🍪

A Firefox add-on that automatically rejects cookie consent banners.

## How it works

Cookie Pookie runs DuckDuckGo's open-source [autoconsent](https://github.com/duckduckgo/autoconsent) engine, the same one behind DuckDuckGo's Cookie Pop-up Protection. It ships with over 1,000 rules for consent platforms and individual sites, and:

- **Rejects** on known consent platforms (OneTrust, Cookiebot, Didomi, Quantcast, Usercentrics, TrustArc and many more), using each platform's own API where one exists.
- **Falls back to heuristics** for unknown banners, limited to clicking buttons it recognizes as "reject". It never accepts cookies.
- **Hides** banners that offer no reject option at all, instead of clicking anything.
- **Pre-hides** known banners while it works, so you rarely see them flash.

Code layout:

| Path | What it does |
| --- | --- |
| `src/content/content.js` | Starts the engine in every frame and relays its messages. |
| `src/background.js` | Gives each frame its rules and settings, runs the engine's main-world snippets, applies the on/off switches and counts handled banners. |
| `src/popup/` | Toolbar popup: global switch, per-site switch, what happened on this page, "Report a broken site", and a prompt when site access is missing. |
| `src/report.js` | Builds the pre-filled GitHub issue link for broken-site reports. |
| `vendor/autoconsent/` | Built copy of autoconsent and its rules (MPL-2.0). Don't edit by hand. |
| `scripts/build-autoconsent.sh` | Rebuilds `vendor/autoconsent/` from an autoconsent release. |
| `tests/*.test.mjs` | Unit tests for the background logic and report link, using a fake `browser` API. |
| `tests/e2e/` | Real-Firefox tests: test pages with sample banners, run with Puppeteer. |
| `.github/workflows/` | `test.yml` runs all tests and the linter on every push and PR; `update-autoconsent.yml` updates the rules weekly. |

The per-site switch is decided by the tab's top-level site, so it also covers consent banners loaded in iframes.

Requires Firefox 128 or later, on desktop or Android. On Android the popup opens as a full page; if Firefox hasn't granted access to all websites, the popup shows a button to allow it.

### Reporting broken sites

The popup's **Report a broken site** button opens a pre-filled issue in this repository with the page address (without query string or fragment, which can hold personal data), what Cookie Pookie handled, and version numbers. While the repository is private, only people with access to it can file reports; change `COOKIE_POOKIE_ISSUES_URL` in `src/report.js` if reports should go elsewhere.

## Develop

Quickest way, no tooling needed:

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…** and choose `manifest.json`.
3. Visit a site with a cookie banner. The toolbar badge shows how many banners were handled, and the popup says which.

With [web-ext](https://github.com/mozilla/web-ext):

```sh
npm install
npm start      # launches Firefox with the add-on loaded and auto-reloading
npm test       # unit tests (plain Node, no install needed)
npm run lint   # Mozilla's add-on linter

npx puppeteer browsers install firefox
npm run test:e2e   # real Firefox with the add-on, against tests/e2e/fixtures
npm run build  # zip for addons.mozilla.org, in web-ext-artifacts/
```

## Updating the rules

autoconsent releases often, mostly with new rules. Every Monday, the **Update autoconsent rules** workflow checks for a newer release, rebuilds `vendor/autoconsent/`, runs all tests including real Firefox, and opens a pull request for you to merge. You can also start it from the Actions tab.

For it to open pull requests, enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. Pull requests opened by the workflow don't trigger the Test workflow on their own (a GitHub safeguard), which is why the update workflow runs the full test suite itself before opening one.

To update by hand:

```sh
scripts/build-autoconsent.sh            # rebuild the pinned version
scripts/build-autoconsent.sh 16.58.0    # or move to a newer release
npm test
```

The script needs git plus either [bun](https://bun.sh) or Node with npx. `vendor/autoconsent/VERSION` records the exact release and commit.

## Before publishing

- Replace the placeholder add-on ID `cookie-pookie@example.com` in `manifest.json` with one you own.
- addons.mozilla.org asks for the source of bundled code. Point reviewers to `scripts/build-autoconsent.sh` and the autoconsent release in `vendor/autoconsent/VERSION`.
- `vendor/autoconsent/` is under the Mozilla Public License 2.0; keep its `LICENSE` file and headers. Your own code can use any license.

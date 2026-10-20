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
| `src/popup/` | Toolbar popup: global switch, per-site switch, what happened on this page, "Report a broken site", a link to the options page, and a prompt when site access is missing. |
| `src/options/` | Options page (Add-ons Manager → Cookie Pookie → Preferences, or **Manage sites** in the popup): lists the sites where Cookie Pookie is off, each with a button to turn it back on. |
| `src/report.js` | Builds the pre-filled GitHub issue link for broken-site reports. |
| `src/theme.css`, `src/i18n.js` | Colours (light and dark) and translation helpers shared by the popup and the options page. |
| `_locales/` | Translations: English, German, French, Dutch, Spanish and Italian. |
| `vendor/autoconsent/` | Built copy of autoconsent and its rules (MPL-2.0). Don't edit by hand. |
| `scripts/build-autoconsent.sh` | Rebuilds `vendor/autoconsent/` from an autoconsent release. |
| `scripts/release.sh`, `scripts/amo-metadata.mjs` | Start a release, and write its addons.mozilla.org notes from `CHANGELOG.md`. |
| `docs/amo-listing.md`, `scripts/amo-listing.mjs` | The addons.mozilla.org listing text in every language, and the script that sends it there. |
| `tests/*.test.mjs` | Unit tests for the background logic, the report link and the translations. |
| `tests/perf/` | Performance check (`npm run perf`): page-load time with and without the add-on. |
| `tests/e2e/` | Real-Firefox tests, run with Puppeteer: test pages modelled on OneTrust, Cookiebot, Didomi, Quantcast, CookieYes, Usercentrics and Sourcepoint, plus banners for the heuristics, inside an iframe and without a reject button. Each test also checks which rule handled the banner, using a test-only content script (`probe.js`) in a copy of the add-on. |
| `.github/workflows/` | `test.yml` runs all tests and the linter on every push and PR; `update-autoconsent.yml` updates the rules weekly; `release.yml` submits tagged releases to addons.mozilla.org; `listing.yml` updates the listing text there when `docs/amo-listing.md` changes. |

The per-site switch is decided by the tab's top-level site, so it also covers consent banners loaded in iframes.

Requires Firefox 140 or later on desktop, or 142 or later on Android (the first versions that understand the manifest's `data_collection_permissions`). On Android the popup opens as a full page; if Firefox hasn't granted access to all websites, the popup shows a button to allow it.

### Reporting broken sites

The popup's **Report a broken site** button opens a pre-filled issue in this repository with the page address (without query string or fragment, which can hold personal data), what Cookie Pookie handled, and version numbers. Change `COOKIE_POOKIE_ISSUES_URL` in `src/report.js` if reports should go elsewhere.

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

## Performance

`npm run perf` measures how much Cookie Pookie slows pages down. It loads local test pages in two Firefox runs, one with the add-on and one with a copy that has no content script, and compares medians. The pages time themselves and move on by themselves, because browser automation adds per-frame overhead that would roughly triple the add-on's apparent cost. It needs Firefox installed (set `FIREFOX=/path/to/firefox` if it isn't on the `PATH`) and takes about 10 minutes; `ROUNDS`, `PAGES` and `ADDON` are described at the top of `tests/perf/run.mjs`. Results vary by a few milliseconds between runs, so it isn't part of CI.

Results for 0.4.0 on Firefox 158, Linux, 40 rounds per page (median extra time with the add-on):

| Page | DOM ready | Fully loaded |
| --- | --- | --- |
| Article, no banner | +8 ms | +7 ms |
| OneTrust banner | +1 ms | +7 ms |
| Large page that keeps changing | +31 ms | +54 ms (its own DOM updates: +14%) |
| 20 iframes | +21 ms | +202 ms |

- On ordinary pages the add-on costs well under 10 ms.
- Each iframe costs about 7–10 ms: roughly 1 ms for any content script, 2–3 ms to load autoconsent, and 4 ms to start the engine. It adds up on pages with many frames. Switching off heuristics or the popup observer doesn't change it, and filtering rules for a frame takes 0.1 ms; it's the engine starting in each frame. On real sites the frames also wait for the network, which hides part of it.
- Since 0.4.1, the engine doesn't start in hidden or tiny frames (tracking pixels, ad syncing) until they're shown at 100×40 pixels or more (`src/content/content.js`). On a page with 4 visible and 16 hidden iframes, that cut the add-on's extra load time from about +190 ms to +107 ms. Visible frames are unchanged.
- Known banners are hidden as soon as the page starts and rejected about 0.6 s later, so the banner doesn't flash while the engine works.

## Translations

The popup and the add-on description are translated with Firefox's [i18n API](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Internationalization): `_locales/<language>/messages.json` holds each language's text, and `_locales/en/messages.json` also describes each message for translators. Firefox picks the language from its own interface language and falls back to English.

To add a language, copy `_locales/en/messages.json` to `_locales/<code>/messages.json`, translate each `message`, and drop the `description` fields. Keep `$PLACEHOLDERS$` as they are. The `total_*` messages are plural forms: `total_one` and `total_other` are required, and languages that need more forms add them, such as `total_few` and `total_many` for Polish. `npm test` checks that every language has every message with the right placeholders.

Broken-site reports stay in English, since they're GitHub issues for the maintainer.

The translations were written without native-speaker review; corrections are welcome.

## Updating the rules

autoconsent releases often, mostly with new rules. Every Monday, the **Update autoconsent rules** workflow checks for a newer release, rebuilds `vendor/autoconsent/`, runs all tests including real Firefox, and opens a pull request for you to merge. You can also start it from the Actions tab.

For it to open pull requests, enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. Pull requests opened by the workflow don't trigger the Test workflow on their own (a GitHub safeguard), which is why the update workflow runs the full test suite itself before opening one.

To update by hand:

```sh
npm ci                                  # installs the pinned esbuild
scripts/build-autoconsent.sh            # rebuild the version in vendor/autoconsent/VERSION
scripts/build-autoconsent.sh 16.58.0    # or move to a newer release
npm test
```

The script needs Node with npm. It builds from DuckDuckGo's published `@duckduckgo/autoconsent` npm package: the rules are copied as published, and the JavaScript is bundled from the package's sources with the esbuild version pinned in `package-lock.json`. The same version always gives byte-identical files, so anyone can check `vendor/autoconsent/` by rebuilding it. `vendor/autoconsent/VERSION` records the release, the package's integrity hash and the esbuild version.

## Releasing

Releases go to [addons.mozilla.org](https://addons.mozilla.org) through the **Release** workflow:

1. Add a `## 0.4.0` section to [CHANGELOG.md](CHANGELOG.md) with the release notes, written for users, and commit it.
2. Run `scripts/release.sh 0.4.0`. It checks that `master` is clean and in sync, bumps the version in `manifest.json`, `package.json` and `package-lock.json`, commits, tags `v0.4.0` and pushes.
3. The tag starts the Release workflow. It checks that `vendor/autoconsent/` rebuilds byte for byte, runs all tests and the linter, submits the version to addons.mozilla.org with its source code, release notes and reviewer notes (written by `scripts/amo-metadata.mjs`), and publishes a GitHub release with the same files. Mozilla emails you when the review is done.

A merged autoconsent update only reaches users once it's released, so release after merging one.

The automated tests only cover desktop Firefox. Before releases that change the popup, the options page, the manifest or permissions, run through the [Android checklist](docs/android-testing.md) on a phone.

The listing's summary, description and privacy policy live in [docs/amo-listing.md](docs/amo-listing.md), in every language. Pushing a change to it runs the **Update AMO listing** workflow, which sends it to addons.mozilla.org; check the result first with `node scripts/amo-listing.mjs --dry-run`. Screenshots and categories are still edited on the website.

One-time setup: create API credentials at [addons.mozilla.org/developers/addon/api/key](https://addons.mozilla.org/developers/addon/api/key/), then add them as repository secrets under **Settings → Secrets and variables → Actions**: the JWT issuer as `AMO_JWT_ISSUER` and the JWT secret as `AMO_JWT_SECRET`.

Things to keep in mind:

- The add-on ID `cookie-pookie@baguettegod` in `manifest.json` is permanent; never change it.
- addons.mozilla.org never accepts the same version number twice, even for a version that was disabled or rejected.
- `data_collection_permissions` in `manifest.json` declares that the add-on collects no data. Update it if that ever changes.
- `vendor/autoconsent/` is under the Mozilla Public License 2.0, like the rest of Cookie Pookie; keep its `LICENSE` file and headers.

## License

Cookie Pookie is licensed under the [Mozilla Public License 2.0](LICENSE). It bundles [autoconsent](https://github.com/duckduckgo/autoconsent) by DuckDuckGo, also under MPL 2.0.

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
| `_locales/` | Translations: English, German, French, Dutch, Spanish and Italian. |
| `vendor/autoconsent/` | Built copy of autoconsent and its rules (MPL-2.0). Don't edit by hand. |
| `scripts/build-autoconsent.sh` | Rebuilds `vendor/autoconsent/` from an autoconsent release. |
| `scripts/release.sh`, `scripts/amo-metadata.mjs` | Start a release, and write its addons.mozilla.org notes from `CHANGELOG.md`. |
| `tests/*.test.mjs` | Unit tests for the background logic, the report link and the translations. |
| `tests/e2e/` | Real-Firefox tests: test pages with sample banners, run with Puppeteer. |
| `.github/workflows/` | `test.yml` runs all tests and the linter on every push and PR; `update-autoconsent.yml` updates the rules weekly; `release.yml` submits tagged releases to addons.mozilla.org. |

The per-site switch is decided by the tab's top-level site, so it also covers consent banners loaded in iframes.

Requires Firefox 128 or later, on desktop or Android. On Android the popup opens as a full page; if Firefox hasn't granted access to all websites, the popup shows a button to allow it.

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

One-time setup: create API credentials at [addons.mozilla.org/developers/addon/api/key](https://addons.mozilla.org/developers/addon/api/key/), then add them as repository secrets under **Settings → Secrets and variables → Actions**: the JWT issuer as `AMO_JWT_ISSUER` and the JWT secret as `AMO_JWT_SECRET`.

Things to keep in mind:

- The add-on ID `cookie-pookie@baguettegod` in `manifest.json` is permanent; never change it.
- addons.mozilla.org never accepts the same version number twice, even for a version that was disabled or rejected.
- `data_collection_permissions` in `manifest.json` declares that the add-on collects no data. Update it if that ever changes.
- `vendor/autoconsent/` is under the Mozilla Public License 2.0, like the rest of Cookie Pookie; keep its `LICENSE` file and headers.

## License

Cookie Pookie is licensed under the [Mozilla Public License 2.0](LICENSE). It bundles [autoconsent](https://github.com/duckduckgo/autoconsent) by DuckDuckGo, also under MPL 2.0.

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
| `src/popup/` | Toolbar popup: global switch, per-site switch, what happened on this page. |
| `vendor/autoconsent/` | Built copy of autoconsent and its rules (MPL-2.0). Don't edit by hand. |
| `scripts/build-autoconsent.sh` | Rebuilds `vendor/autoconsent/` from an autoconsent release. |
| `tests/` | Node tests for the background logic, using a fake `browser` API. |

The per-site switch is decided by the tab's top-level site, so it also covers consent banners loaded in iframes.

Requires Firefox 128 or later.

## Develop

Quickest way, no tooling needed:

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…** and choose `manifest.json`.
3. Visit a site with a cookie banner. The toolbar badge shows how many banners were handled, and the popup says which.

With [web-ext](https://github.com/mozilla/web-ext):

```sh
npm install
npm start      # launches Firefox with the add-on loaded and auto-reloading
npm test       # background logic tests (plain Node, no install needed)
npm run lint   # Mozilla's add-on linter
npm run build  # zip for addons.mozilla.org, in web-ext-artifacts/
```

## Updating the rules

autoconsent releases often, mostly with new rules. To update:

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

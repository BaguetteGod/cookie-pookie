# Cookie Pookie 🍪

A Firefox add-on that automatically rejects cookie consent banners.

## How it works

Cookie Pookie tries three things on every page, in this order of preference:

1. **Platform APIs** (`src/content/page-api.js`) — runs in the page's own context and calls the consent platform's JavaScript API to record a rejection (Didomi, Usercentrics, Cookiebot). Most reliable when available.
2. **Platform rules** (`src/content/rules.js`) — clicks the real "Reject" button of known platforms (OneTrust, Cookiebot, Didomi, Quantcast, Usercentrics, TrustArc).
3. **Generic fallback** (`src/content/content.js`) — looks for a visible cookie/consent container and clicks a button whose whole label means "reject" in English, Spanish, French, German, Italian, Portuguese or Dutch.

It never clicks anything that looks like an accept button, and it stops watching a page after 15 seconds.

The background script (`src/background.js`) stores settings, applies the per-site switch (decided by the tab's top-level site, so it covers iframes too) and counts rejections for the toolbar badge. The popup lets you switch Cookie Pookie off globally or for the current site.

Requires Firefox 128 or later (for main-world content scripts).

## Develop

Quickest way, no tooling needed:

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…** and choose `manifest.json`.
3. Visit a site with a cookie banner. Open the console and filter for `[Cookie Pookie]` to see what it did.

With [web-ext](https://github.com/mozilla/web-ext):

```sh
npm install
npm start      # launches Firefox with the add-on loaded and auto-reloading
npm run lint   # Mozilla's add-on linter
npm run build  # zip for addons.mozilla.org, in web-ext-artifacts/
```

## Adding a rule

Add an entry to `COOKIE_POOKIE_RULES` in `src/content/rules.js`:

```js
{
  name: "Some CMP",
  detect: "#some-cmp-banner",            // present when the banner is showing
  steps: [{ click: "#some-cmp-reject" }] // must end in a reject choice
}
```

Steps can also be `{ clickText: [selector, /regex/] }` or `{ wait: ms }`, and `shadowHost` points at an element whose open shadow root holds the banner.

## Before publishing

- Replace the placeholder add-on ID `cookie-pookie@example.com` in `manifest.json` with one you own.
- Consider building on [`@duckduckgo/autoconsent`](https://github.com/duckduckgo/autoconsent) for far wider coverage than the starter rules.

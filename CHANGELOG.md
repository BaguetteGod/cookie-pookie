# Changelog

Each `## <version>` section becomes that version's release notes on addons.mozilla.org and GitHub, so write it for users. `scripts/release.sh` won't release a version without one.

## 0.5.0

- Deletes tracking cookies (Google Analytics, Meta Pixel, Hotjar and others) as soon as a site sets them, with its own switch in the popup. Consent, login and security cookies are never touched.
- The per-site switch now covers both rejecting banners and deleting cookies

## 0.4.1

- Faster on pages with many hidden iframes, such as tracking pixels
- Now requires Firefox 140 or later (Firefox for Android 142 or later)

## 0.4.0

- Now available in German, French, Dutch, Spanish and Italian
- New options page listing the sites where Cookie Pookie is off, with a button to turn each back on (also reachable via "Manage sites" in the popup)

## 0.3.1

First release.

- Automatically rejects cookie consent banners on 1,000+ consent platforms and sites, using DuckDuckGo's autoconsent rules
- Toolbar badge and popup show what was handled on each page
- Turn it off globally or per site
- "Report a broken site" button
- Works on Firefox for desktop and Android

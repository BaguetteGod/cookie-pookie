# Testing on Firefox for Android

The automated tests only run desktop Firefox, so check Android by hand before releases that change the popup, the options page, the manifest or permissions, and before 1.0. It takes about 15 minutes.

You need an Android phone (or emulator) with **Firefox for Android 142 or later**. Many banners only appear to visitors in the EU or UK; elsewhere, use a VPN set to an EU country.

## Setup

**Option A: run the development version** (for testing before a release)

1. On the phone, enable **USB debugging** (Settings → About phone → tap *Build number* seven times, then Settings → System → Developer options → *USB debugging*).
2. In Firefox for Android, enable **Settings → Remote debugging via USB**.
3. Connect the phone by USB, accept the debugging prompt, and check it's listed:

   ```sh
   adb devices
   ```

4. From the project folder, start Firefox on the phone with the add-on loaded, using the device ID from `adb devices`:

   ```sh
   npx web-ext run -t firefox-android --adb-device <device-id> --firefox-apk org.mozilla.firefox
   ```

   For Firefox Beta use `org.mozilla.firefox_beta`, for Nightly `org.mozilla.fenix`. The add-on stays loaded until you stop `web-ext` with Ctrl+C.

**Option B: install the released version** (for checking what users get): open the Cookie Pookie page on addons.mozilla.org in Firefox for Android and tap **Add to Firefox**.

Start from a clean state: in Firefox for Android, clear cookies and site data (Settings → Delete browsing data), so sites show their banners again.

## Checklist

### Install and permissions

- [ ] The add-on installs without errors and appears under **Menu → Extensions**.
- [ ] Open the popup (**Menu → Extensions → Cookie Pookie**). If Firefox hasn't granted access to all websites, the popup shows the warning with **Allow on all websites**; tapping it shows Firefox's permission prompt, and after allowing, the warning disappears.
- [ ] If the warning didn't appear, check **Menu → Extensions → Cookie Pookie → Permissions**: access to all websites is on.

### Banners on real sites

Visit each site and check that the banner disappears on its own (or never shows), without accepting anything. Sites change consent platforms now and then; if one shows no banner at all, try another site that uses the same platform.

| Site | Platform | Banner rejected? |
| --- | --- | --- |
| theguardian.com | Sourcepoint (banner in an iframe) | [ ] |
| stackoverflow.com | OneTrust | [ ] |
| cookiebot.com | Cookiebot | [ ] |
| lemonde.fr | Didomi | [ ] |
| usercentrics.com | Usercentrics | [ ] |
| a site with an IAB TCF banner, such as spiegel.de or corriere.it | IAB TCF | [ ] |

- [ ] On each site, the page scrolls and works normally afterwards (no grey overlay or frozen scrolling left behind).
- [ ] Pages don't load noticeably slower than without the add-on.

### Popup

Open the popup on a site where a banner was handled.

- [ ] It opens as a full page and fits the screen width: no sideways scrolling, nothing cut off.
- [ ] It names the site and says what was handled, such as "Rejected cookies on the Onetrust banner."
- [ ] The banner count goes up after visiting another site with a banner, and says "1 banner" (not "1 banners") after the first one.
- [ ] Switches and buttons are easy to tap.
- [ ] With the phone in dark mode, the popup is dark and readable.

### Switches

- [ ] Turn off **On \<site\>**, reload the page: the banner shows again. Turn it back on, clear that site's data, reload: the banner is rejected again.
- [ ] Turn off **Reject cookie banners**, reload any site with a banner: the banner shows. Turn it back on.

### Options page

- [ ] Turn off one or two sites with the per-site switch, then tap **Manage sites** in the popup: the options page opens and lists those sites.
- [ ] The page also opens from **Menu → Extensions → Cookie Pookie → Settings**.
- [ ] **Turn back on** removes a site from the list; with no sites left, the page explains how to turn it off for a site.

### Report a broken site

- [ ] **Report a broken site** opens a pre-filled GitHub issue in a new tab, with the site's address (without anything after `?` or `#`) and version numbers. Don't submit it.

### Translations

- [ ] Switch the phone's language to German (or Firefox's language, in Settings → Language): the popup and options page appear in German. Switch back.

### Private tabs

- [ ] By default, the add-on doesn't run in private tabs. After allowing it (**Menu → Extensions → Cookie Pookie → Run in private browsing**), banners in private tabs are rejected too.

## Recording the result

Note the result in the release's pull request or GitHub release, for example:

```text
Android check for 0.5.0: passed
Pixel 7, Android 15, Firefox 158.0, from web-ext run
Notes: lemonde.fr showed no banner (outside the EU); tested didomi.com instead.
```

If something fails, open an issue with the device, Android and Firefox versions, the site, and what happened.

// Bundled into vendor/autoconsent/background-lib.js by scripts/build-autoconsent.sh.
// Copied into the unpacked autoconsent npm package at build time, so paths are relative to it.
import { snippets } from '../lib/eval-snippets';
import { filterCompactRules } from '../lib/encoding';

globalThis.CookiePookieAutoConsentLib = { snippets, filterCompactRules };

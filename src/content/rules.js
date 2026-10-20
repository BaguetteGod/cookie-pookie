/*
 * Cookie Pookie — consent platform rules.
 *
 * Each rule describes one consent management platform (CMP):
 *   detect:  CSS selector that is present when this CMP's banner is on the page
 *   steps:   ordered list of actions that end in a "reject" choice
 *            { click: selector }            click the first visible match
 *            { clickText: [selector, re] }  click the first match whose text fits re
 *            { wait: ms }                   pause between steps
 *   shadowHost (optional): selector of an element whose open shadow root holds the banner
 *
 * Rules must only ever lead to rejecting / "necessary only". Never add an accept step.
 */

// eslint-disable-next-line no-unused-vars
const COOKIE_POOKIE_RULES = [
  {
    name: "OneTrust",
    detect: "#onetrust-banner-sdk",
    steps: [{ click: "#onetrust-reject-all-handler" }]
  },
  {
    name: "Cookiebot",
    detect: "#CybotCookiebotDialog",
    steps: [
      { click: "#CybotCookiebotDialogBodyButtonDecline, #CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll" }
    ]
  },
  {
    name: "Didomi",
    detect: "#didomi-host, #didomi-notice",
    steps: [{ click: "#didomi-notice-disagree-button, .didomi-continue-without-agreeing" }]
  },
  {
    name: "Quantcast Choice",
    detect: ".qc-cmp2-container",
    steps: [{ clickText: [".qc-cmp2-summary-buttons button, .qc-cmp2-footer button", /reject|disagree|rechazar|refuser|ablehnen/i] }]
  },
  {
    name: "Usercentrics",
    detect: "#usercentrics-root, #usercentrics-cmp-ui",
    shadowHost: "#usercentrics-root",
    steps: [{ click: "[data-testid='uc-deny-all-button'], #deny" }]
  },
  {
    name: "TrustArc",
    detect: "#truste-consent-track",
    steps: [{ click: "#truste-consent-required" }]
  }
];

// Text that means "reject" on a generic banner, in several languages.
// eslint-disable-next-line no-unused-vars
const COOKIE_POOKIE_REJECT_TEXT = new RegExp(
  [
    "^(reject|decline|deny|refuse)( all)?( cookies)?$",
    "^only (necessary|essential|required)( cookies)?$",
    "^(use )?necessary cookies only$",
    "^continue without (accepting|agreeing)$",
    "^rechazar( todo| todas| cookies)?$",
    "^solo (necesarias|esenciales)$",
    "^(tout )?refuser( tout)?$",
    "^continuer sans accepter$",
    "^(alle )?ablehnen$",
    "^nur (notwendige|essenzielle)( cookies)?$",
    "^rifiuta( tutto| tutti)?$",
    "^rejeitar( tudo| todos)?$",
    "^(alles )?weigeren$"
  ].join("|"),
  "i"
);

// Words that mark a button as an accept button. Used as a safety net:
// a button matching this is never clicked, even if it also matches a reject pattern.
// eslint-disable-next-line no-unused-vars
const COOKIE_POOKIE_ACCEPT_TEXT =
  /\b(accept|agree|allow|ok|got it|aceptar|accepter|akzeptieren|zustimmen|accetta|aceitar|accepteren)\b/i;

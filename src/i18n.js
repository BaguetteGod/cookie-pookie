/* Cookie Pookie — translation helpers shared by the popup and the options page. */

const t = (key, ...substitutions) => browser.i18n.getMessage(key, substitutions);
const language = browser.i18n.getUILanguage();

// Fills every element marked with data-i18n="messageName" with that message.
function localize() {
  document.documentElement.lang = language;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
}

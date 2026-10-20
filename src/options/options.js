/* Cookie Pookie — options page: the sites where Cookie Pookie is turned off. */
/* global t, localize */

const $ = (id) => document.getElementById(id);

async function turnBackOn(host) {
  const { disabledSites } = await browser.storage.local.get({ disabledSites: [] });
  await browser.storage.local.set({ disabledSites: disabledSites.filter((site) => site !== host) });
}

function siteItem(host) {
  const name = document.createElement("span");
  name.className = "host";
  name.textContent = host;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = t("optionsTurnOn");
  button.setAttribute("aria-label", t("optionsTurnOnLabel", host));
  button.addEventListener("click", () => turnBackOn(host));

  const item = document.createElement("li");
  item.append(name, button);
  return item;
}

async function render() {
  const { disabledSites } = await browser.storage.local.get({ disabledSites: [] });
  const sites = [...disabledSites].sort((a, b) => a.localeCompare(b));
  $("sites").replaceChildren(...sites.map(siteItem));
  $("sites").hidden = sites.length === 0;
  $("empty").hidden = sites.length > 0;
}

// Stay in sync with the popup: switching a site off there shows up here at once.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.disabledSites) render();
});

localize();
render();

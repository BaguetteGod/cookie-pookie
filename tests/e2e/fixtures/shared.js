// Shared by the e2e test pages. Records which consent button got clicked on
// <html data-clicked="...">, so the test runner can read the outcome.
function record(choice) {
  const html = document.documentElement;
  const previous = html.dataset.clicked;
  html.dataset.clicked = previous ? `${previous},${choice}` : choice;
}

document.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest("[data-choice]");
    if (!button) return;
    record(button.dataset.choice);
    const banner = button.closest("[data-banner]");
    if (banner) banner.remove();
  },
  true
);

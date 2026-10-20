// Shared by the e2e test pages. Records which consent button got clicked on
// <html data-clicked="...">, so the test runner can read the outcome.
function record(choice) {
  const html = document.documentElement;
  const previous = html.dataset.clicked;
  html.dataset.clicked = previous ? `${previous},${choice}` : choice;
  if (!previous) html.dataset.clickedAt = String(Math.round(performance.now())); // for tests/perf
}

document.addEventListener(
  "click",
  (event) => {
    // composedPath() also reaches into shadow roots (Usercentrics renders in one).
    const button = event.composedPath().find((el) => el instanceof Element && el.matches("[data-choice]"));
    if (!button) return;
    record(button.dataset.choice);
    const banner = button.closest("[data-banner]");
    if (banner) banner.remove();
  },
  true
);

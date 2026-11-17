// The status words in each sidebar row's aria-labels, to check which state selectors match.
// Run: npm run dev -- eval <theme> probes/states.js [view]
return [...document.querySelectorAll("[data-thread-item]")].map((row) =>
  [...row.querySelectorAll("[aria-label]")].map((el) => el.getAttribute("aria-label")).join(" | "),
);

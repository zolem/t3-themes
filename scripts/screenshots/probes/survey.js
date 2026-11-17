// Every data-* attribute on the page, plus data-slot and data-testid values, with how often
// each appears and where the first one is. Run: npm run dev -- eval <theme> probes/survey.js [view]
const seen = {};
for (const el of document.querySelectorAll("*")) {
  for (const a of el.attributes) {
    if (!a.name.startsWith("data-")) continue;
    const key = ["data-slot", "data-testid", "data-timeline-row-kind", "data-workspace-area"].includes(a.name)
      ? `${a.name}="${a.value}"`
      : a.name;
    const r = el.getBoundingClientRect();
    seen[key] ??= { count: 0, first: `${el.tagName.toLowerCase()} at ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` };
    seen[key].count++;
  }
}
return Object.fromEntries(Object.entries(seen).sort(([a], [b]) => a.localeCompare(b)));

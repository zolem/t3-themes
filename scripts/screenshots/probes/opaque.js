// Large elements with a solid background. These hide a theme's background image.
// Run: npm run dev -- eval <theme> probes/opaque.js [view]
const out = [];
for (const el of document.querySelectorAll("body, body *")) {
  const r = el.getBoundingClientRect();
  if (r.width < 300 || r.height < 300) continue;
  const bg = getComputedStyle(el).backgroundColor;
  if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue;
  const attrs = [...el.attributes].filter((a) => a.name.startsWith("data-") || a.name === "id").map((a) => `[${a.name}="${a.value}"]`);
  out.push(`${el.tagName.toLowerCase()}${attrs.join("")} ${Math.round(r.width)}x${Math.round(r.height)} ${bg}`);
}
return out;

import { highlightColour } from "./theme";

const SCRIPT = "https://widgetv3.bandsintown.com/main.min.js";

// Widget settings drawn in the band's highlight colour. The widget reads them
// once, when it draws.
const HIGHLIGHT_SETTINGS = [
  "data-date-color",
  "data-link-color",
  "data-event-ticket-cta-bg-color",
  "data-event-ticket-cta-border-color",
];

/**
 * The Bandsintown widget script turns .bit-widget-initializer links into a
 * tour list when it loads. Load it (again, after an in-page navigation brings
 * in a new widget) once the page has the band's highlight colour.
 */
export const refreshBandsintown = (root: ParentNode): void => {
  const widgets = root.querySelectorAll(".bit-widget-initializer");
  if (!widgets.length) return;
  const colour = highlightColour();
  for (const widget of Array.from(widgets)) {
    for (const name of HIGHLIGHT_SETTINGS) widget.setAttribute(name, colour);
  }
  document.querySelectorAll(`script[src="${SCRIPT}"]`).forEach((s) => s.remove());
  const script = document.createElement("script");
  script.src = SCRIPT;
  script.async = true;
  script.charset = "utf-8";
  document.body.append(script);
};

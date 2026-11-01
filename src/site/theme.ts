import type { About } from "../api/client";
import type { BandState } from "../data/band";
import { mediaUrl } from "../data/media";
import { qsa } from "../lib/dom";

// The band's look from the API (set in the MusicPowered admin). The pages and
// stylesheet have their own copies, which stay when the API has nothing:
//
//   --highlight, --highlight-rgb       the highlight colour (styles.css :root)
//   <img data-band-image="main_logo">  an image's src, by About field
//   <body data-band-background="…">    the page background, by About field;
//                                      the <body> class picks the local one

const PLANTS = ["wattle", "eucalyptus", "kangaroo-paw", "bottlebrush"];

const SELECT_ARROW_PATH = "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z";

/** "#02bacd" or "#0bc" → [2, 186, 205]. */
const hexToRgb = (value: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const applyHighlight = (colour: string | undefined): void => {
  const style = document.documentElement.style;
  const rgb = colour ? hexToRgb(colour) : null;
  if (!rgb) {
    style.removeProperty("--highlight");
    style.removeProperty("--highlight-rgb");
    style.removeProperty("--select-arrow");
    return;
  }
  const hex = `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  const arrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${hex}"><path d="${SELECT_ARROW_PATH}"/></svg>`;
  style.setProperty("--highlight", hex);
  style.setProperty("--highlight-rgb", rgb.join(", "));
  style.setProperty("--select-arrow", `url("data:image/svg+xml,${encodeURIComponent(arrow)}")`);
};

/** The highlight colour in use, for things styled outside CSS (Stripe, Bandsintown). */
export const highlightColour = (): string =>
  getComputedStyle(document.documentElement).getPropertyValue("--highlight").trim() || "#02bacd";

/** An About image field as a full web address that's safe to use in src or url(). */
const aboutImage = (about: About | null, field: string | undefined): string | null => {
  if (!about || !field || !(field in about)) return null;
  const value = (about as unknown as Record<string, unknown>)[field];
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(mediaUrl(value.trim()));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // The URL parser already encodes quotes; backslashes are escapes in CSS.
    return url.href.replace(/\\/g, "%5C");
  } catch {
    return null;
  }
};

const applyImages = (about: About | null): void => {
  for (const img of qsa<HTMLImageElement>("img[data-band-image]")) {
    // The page's own image stays as the fallback.
    const local = (img.dataset.localSrc ??= img.getAttribute("src") ?? "");
    const src = aboutImage(about, img.dataset.bandImage) ?? local;
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.onerror = () => {
      if (img.getAttribute("src") !== local) img.setAttribute("src", local);
    };
  }
};

const applyBackground = (about: About | null): void => {
  const url = aboutImage(about, document.body.dataset.bandBackground);
  if (url) document.body.style.setProperty("--page-background", `url("${url}")`);
  else document.body.style.removeProperty("--page-background");
};

/** Shows the band's colour, logo, photos and page background from the API. */
export const applyTheme = (state: BandState): void => {
  applyHighlight(state.about?.highlight_colour);
  applyImages(state.about);
  applyBackground(state.about);
};

/** After an in-page navigation, take the new page's background (applyTheme fills it in). */
export const syncBackground = (next: Document): void => {
  const plant = PLANTS.find((p) => next.body.classList.contains(p));
  document.body.classList.remove(...PLANTS);
  if (plant) document.body.classList.add(plant);
  const field = next.body.dataset.bandBackground;
  if (field) document.body.dataset.bandBackground = field;
  else delete document.body.dataset.bandBackground;
};

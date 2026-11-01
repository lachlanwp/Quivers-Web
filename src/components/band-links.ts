import type { FooterLink } from "../api/client";
import { html, raw, safeUrl, type SafeHtml } from "../lib/dom";

// The band's links (socials and music services) from the MusicPowered admin,
// shown in the footer and on the Music page. The admin names each link's icon
// after Font Awesome ("facebook-f", "apple", ...).

interface Service {
  name: string;
  /** SVG path in a 24x24 box. */
  path: string;
  /** Music services get a card on the Music page, with this note, in this order. */
  note?: string;
}

const SERVICES: Record<string, Service> = {
  bandcamp: { name: "Bandcamp", note: "Buy downloads and records", path: "M0 18.75l7.437-13.5H24l-7.438 13.5H0z" },
  spotify: { name: "Spotify", note: "Listen on Spotify", path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" },
  apple: { name: "Apple Music", note: "Listen on Apple Music", path: "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" },
  youtube: { name: "YouTube", note: "Watch the videos", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  facebook: { name: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  instagram: { name: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
  twitter: { name: "Twitter", path: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" },
};

/** Other Font Awesome names for the same services. */
const ALIASES: Record<string, string> = {
  "facebook-f": "facebook",
  "facebook-square": "facebook",
  "instagram-square": "instagram",
  "x-twitter": "twitter",
  "twitter-square": "twitter",
  "youtube-square": "youtube",
  "youtube-play": "youtube",
  itunes: "apple",
  "itunes-note": "apple",
};

const MUSIC_ORDER = Object.keys(SERVICES).filter((key) => SERVICES[key].note);

/** A chain link, for services without their own icon. */
const LINK_PATH =
  "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z";

interface BandLink {
  key: string;
  url: string;
  name: string;
  path: string;
  note?: string;
}

const hostname = (url: string): string => {
  try {
    return new URL(url, location.href).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
};

const resolve = (links: FooterLink[]): BandLink[] =>
  links.flatMap((link) => {
    const url = safeUrl(link.link);
    if (url === "#") return [];
    const icon = (link.icon ?? "").trim().toLowerCase().replace(/^fa-/, "");
    const key = ALIASES[icon] ?? icon;
    const service = SERVICES[key];
    return [{ key, url, name: service?.name ?? hostname(url), path: service?.path ?? LINK_PATH, note: service?.note }];
  });

// The paths are written here, not taken from the API.
const svg = (path: string, className: string): SafeHtml =>
  raw(`<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`);

/** Icon links for the footer, in the API's order. Empty if there are none to show. */
export const socialLinks = (links: FooterLink[]): SafeHtml | null => {
  const shown = resolve(links);
  if (!shown.length) return null;
  return html`${shown.map(
    (link) => html`<a href="${link.url}" aria-label="${link.name}" target="_blank" rel="noopener noreferrer">
      ${svg(link.path, "social-icon")}
    </a>`,
  )}`;
};

/** Cards for the music services (Bandcamp, Spotify, ...). Empty if there are none to show. */
export const streamCards = (links: FooterLink[]): SafeHtml | null => {
  const shown = resolve(links)
    .filter((link) => link.note)
    .sort((a, b) => MUSIC_ORDER.indexOf(a.key) - MUSIC_ORDER.indexOf(b.key));
  if (!shown.length) return null;
  return html`${shown.map(
    (link) => html`<a class="stream-card" href="${link.url}" target="_blank" rel="noopener noreferrer">
      ${svg(link.path, "stream-icon")}
      <span class="stream-name">${link.name}</span>
      <span class="stream-note">${link.note}</span>
    </a>`,
  )}`;
};

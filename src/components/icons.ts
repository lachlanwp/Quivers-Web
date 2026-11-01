import { raw, type SafeHtml } from "../lib/dom";

const PATHS = {
  play: '<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"/>',
  pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z"/>',
  next: '<path d="M5 5.5v13a1 1 0 0 0 1.53.85L16 13.4V18h2V6h-2v4.6L6.53 4.65A1 1 0 0 0 5 5.5z"/>',
  previous: '<path d="M19 5.5v13a1 1 0 0 1-1.53.85L8 13.4V18H6V6h2v4.6l9.47-5.95A1 1 0 0 1 19 5.5z"/>',
  list: '<path d="M3 6h13v2H3zm0 5h13v2H3zm0 5h9v2H3zm16-10v8.17A3 3 0 1 0 21 17V8h2V6z"/>',
  close: '<path d="M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.41 6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.3 6.3 1.41-1.41-6.3-6.3 6.3-6.3z"/>',
  volume: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/>',
  chevronDown: '<path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>',
  chevronLeft: '<path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>',
  bag: '<path d="M18 6h-2a4 4 0 0 0-8 0H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-6-2a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2zm6 16H6V8h2v2h2V8h4v2h2V8h2z"/>',
  plus: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>',
  minus: '<path d="M19 13H5v-2h14z"/>',
  trash: '<path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/>',
  check: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
  lock: '<path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9zm9 14H6V10h12zm-6-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  external: '<path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3zm5 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z"/>',
} as const;

export type IconName = keyof typeof PATHS;

export const icon = (name: IconName, className = ""): SafeHtml =>
  raw(
    `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">${PATHS[name]}</svg>`,
  );

// Values injected at build time by esbuild (see scripts/esbuild-options.ts).
declare const __API_BASE_URL__: string;
declare const __GOOGLE_MAPS_API_KEY__: string;

// Google Analytics (gtag.js) is loaded by a <script> tag in each page.
interface Window {
  gtag?: (...args: unknown[]) => void;
}

// Values injected at build time by esbuild (see scripts/esbuild-options.ts).
declare const __API_BASE_URL__: string;
declare const __GOOGLE_MAPS_API_KEY__: string;

// Google Analytics (gtag.js), started by src/lib/analytics.ts with the
// measurement ID from the API.
interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

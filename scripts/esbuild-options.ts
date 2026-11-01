import type { BuildOptions } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The pages load the bundle from here; production builds add a content hash. */
export const BUNDLE_PATH = "js/app.js";

export type Mode = "production" | "development";

const DEFAULT_API_URL: Record<Mode, string> = {
  production: "https://api.quiversmusic.com",
  // The dev server answers API calls with sample data (dev/mock-api.ts).
  development: "/mock-api",
};

/**
 * Browser key for Google's Geocoding API, used at checkout to find the
 * customer's postage region. Kept out of the repository: set the
 * GOOGLE_MAPS_API_KEY environment variable (a repository secret in CI).
 * Without it, every order is charged each product's standard shipping cost.
 */
export const googleMapsApiKey = (): string => (process.env.GOOGLE_MAPS_API_KEY ?? "").trim();

export const esbuildOptions = (mode: Mode): BuildOptions => {
  const apiUrl = process.env.API_URL || DEFAULT_API_URL[mode];
  const mapsKey = googleMapsApiKey();
  return {
    entryPoints: [path.join(ROOT, "src/main.ts")],
    bundle: true,
    format: "iife",
    target: ["es2020", "chrome90", "firefox90", "safari15"],
    platform: "browser",
    minify: mode === "production",
    sourcemap: mode === "development" ? "inline" : false,
    legalComments: "none",
    logLevel: "warning",
    define: {
      __API_BASE_URL__: JSON.stringify(apiUrl.replace(/\/+$/, "")),
      __GOOGLE_MAPS_API_KEY__: JSON.stringify(mapsKey),
    },
  };
};

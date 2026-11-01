// Builds the deployable site into _site/: the HTML, CSS and images as they
// are, plus src/ bundled into one minified script named after its content
// (js/app.<hash>.js) so browsers never use a stale copy.
//
//   yarn build
//   API_URL=https://example.com yarn build   (another API)
//   GOOGLE_MAPS_API_KEY=… yarn build         (needed for regional shipping)

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BUNDLE_PATH, esbuildOptions, googleMapsApiKey, ROOT } from "./esbuild-options.ts";

const OUT = path.join(ROOT, "_site");

// Regional shipping needs the Google key; without it customers would be
// charged the wrong postage. Refuse to deploy without it. (Pull request
// builds only check the code, and don't get secrets from forks.)
if (!googleMapsApiKey()) {
  const message =
    "GOOGLE_MAPS_API_KEY isn't set, so checkout can't work out regional shipping " +
    "and will charge each product's standard shipping cost.";
  if (process.env.CI && process.env.GITHUB_EVENT_NAME !== "pull_request") {
    console.error(`Build stopped: ${message} Add it as a repository secret.`);
    process.exit(1);
  }
  console.warn(`Warning: ${message}`);
}

// Files in the repository root that are part of the website.
const PUBLIC_FILE = /\.(html|css|ico|png|svg|txt|xml|webmanifest)$/i;
const PUBLIC_NAMES = new Set(["CNAME"]);
const PUBLIC_DIRS = ["images"];

const result = await build({ ...esbuildOptions("production"), write: false });
const bundle = result.outputFiles?.[0];
if (!bundle) throw new Error("esbuild produced no output");

// Six lowercase characters, the same style of suffix cacheBust.sh uses.
const hash = BigInt(`0x${createHash("sha256").update(bundle.contents).digest("hex").slice(0, 12)}`)
  .toString(36)
  .padStart(6, "0")
  .slice(-6);
const hashedPath = BUNDLE_PATH.replace(/\.js$/, `.${hash}.js`);

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, path.dirname(hashedPath)), { recursive: true });
await writeFile(path.join(OUT, hashedPath), bundle.contents);

let pages = 0;
for (const entry of await readdir(ROOT, { withFileTypes: true })) {
  const source = path.join(ROOT, entry.name);
  const target = path.join(OUT, entry.name);
  if (entry.isDirectory() && PUBLIC_DIRS.includes(entry.name)) {
    await cp(source, target, { recursive: true, filter: (f) => !path.basename(f).startsWith(".") });
  } else if (entry.isFile() && (PUBLIC_FILE.test(entry.name) || PUBLIC_NAMES.has(entry.name))) {
    if (entry.name.endsWith(".html")) {
      const html = await readFile(source, "utf8");
      // Point pages at the hashed bundle.
      await writeFile(target, html.replaceAll(`"${BUNDLE_PATH}"`, `"${hashedPath}"`));
      pages += 1;
    } else {
      await cp(source, target);
    }
  }
}

const kb = (bundle.contents.byteLength / 1024).toFixed(1);
console.log(`Built _site/: ${pages} pages, ${hashedPath} (${kb} KB)`);

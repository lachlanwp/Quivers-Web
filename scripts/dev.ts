// Local development server: http://localhost:8080
//
// Serves the site from the repository, rebuilds src/ on every change and
// reloads open pages. API calls go to a sample-data API (dev/mock-api.ts)
// unless API_URL points elsewhere, e.g. API_URL=http://localhost:8088 for
// the real API running locally.
//
//   yarn start
//   PORT=3000 yarn start
//   MOCK_API_DOWN=1 yarn start   (see how pages cope without the API)
//
// Set GOOGLE_MAPS_API_KEY to test regional shipping at checkout.

import { context, type Plugin } from "esbuild";
import { watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import { handleMockApi, MOCK_API_PREFIX } from "../dev/mock-api.ts";
import { BUNDLE_PATH, esbuildOptions, ROOT } from "./esbuild-options.ts";

const PORT = Number(process.env.PORT ?? 8080);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

// Pages listening for "reload" messages.
const listeners = new Set<ServerResponse>();
const reload = () => listeners.forEach((res) => res.write("data: reload\n\n"));
const RELOAD_SCRIPT = `<script>new EventSource("/__reload").onmessage = () => location.reload();</script>`;

let bundle = "";
let ready: () => void;
const firstBuild = new Promise<void>((resolve) => (ready = resolve));

const capture: Plugin = {
  name: "capture",
  setup(build) {
    build.onEnd((result) => {
      const output = result.outputFiles?.[0];
      if (output) {
        bundle = output.text;
        console.log(`[dev] built ${BUNDLE_PATH} (${(output.contents.byteLength / 1024).toFixed(0)} KB)`);
        reload();
      }
      ready();
    });
  },
};

const ctx = await context({ ...esbuildOptions("development"), write: false, plugins: [capture] });
await ctx.watch();

// Reload when pages or styles change too.
watch(ROOT, { recursive: false }, (_event, file) => {
  if (file && /\.(html|css)$/.test(file)) reload();
});

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/__reload") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      listeners.add(res);
      req.on("close", () => listeners.delete(res));
      return;
    }
    if (pathname.startsWith(MOCK_API_PREFIX)) {
      return await handleMockApi(req, res, pathname.slice(MOCK_API_PREFIX.length) || "/", url);
    }
    // The pages ask for js/app.js; production builds rename it with a hash.
    if (/^\/js\/app(\.[a-z0-9]{6})?\.js$/.test(pathname)) {
      await firstBuild;
      res.writeHead(200, { "content-type": TYPES[".js"], "cache-control": "no-store" });
      return res.end(bundle);
    }

    let file = path.join(ROOT, pathname === "/" ? "index.html" : pathname);
    const relative = path.relative(ROOT, file);
    if (relative.startsWith("..") || relative.split(path.sep).some((part) => part.startsWith("."))) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    let status = 200;
    if (!(await stat(file).catch(() => null))?.isFile()) {
      file = path.join(ROOT, "404.html");
      status = 404;
    }
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    let body: Buffer | string = await readFile(file);
    if (type.startsWith("text/html")) body = body.toString("utf8").replace("</body>", `${RELOAD_SCRIPT}</body>`);
    res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  const api = process.env.API_URL ? `API: ${process.env.API_URL}` : "API: sample data (dev/mock-api.ts)";
  console.log(`[dev] http://localhost:${PORT}  ·  ${api}`);
});

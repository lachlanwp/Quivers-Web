import { defineConfig, type InputTransformerFn } from "orval";

// The API serves its OpenAPI document at /api-json (Swagger UI is at /api).
// Set API_SPEC to generate from another source, e.g. a saved copy:
//   API_SPEC=./openapi.json yarn api-generate
const input = process.env.API_SPEC ?? "https://api.quiversmusic.com/api-json";

type Parameter = { name?: string; in?: string };
type Operation = { parameters?: Parameter[] };

// Some API routes use a {param} in the URL without documenting it (e.g.
// GET /reports/config/{type}), which fails validation. Declare any missing
// ones as plain string path parameters.
const declareMissingPathParams: InputTransformerFn = (spec) => {
  const methods = ["get", "put", "post", "delete", "patch", "options", "head"];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const pathItem = item as Record<string, unknown> & Operation;
    const names = [...path.matchAll(/{([^}]+)}/g)].map((m) => m[1]);
    for (const method of methods) {
      const operation = pathItem[method] as Operation | undefined;
      if (!operation) continue;
      const declared = [
        ...(pathItem.parameters ?? []),
        ...(operation.parameters ?? []),
      ];
      for (const name of names) {
        if (!declared.some((p) => p.in === "path" && p.name === name)) {
          operation.parameters = [
            ...(operation.parameters ?? []),
            { name, in: "path", required: true, schema: { type: "string" } },
          ] as Parameter[];
        }
      }
    }
  }
  return spec;
};

export default defineConfig({
  "quivers-api": {
    input: {
      target: input,
      override: { transformer: declareMissingPathParams },
    },
    output: {
      target: "./src/api/quivers-api.ts",
      client: "axios",
      mode: "single",
    },
  },
});

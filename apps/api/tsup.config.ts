import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/scripts/seed.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  // The shared workspace package ships TypeScript source — bundle it in. Everything in `dependencies` stays external.
  noExternal: ["@poster/shared"],
  // dev-only helper used for the embedded MongoDB fallback; never bundled
  external: ["mongodb-memory-server", "pino-pretty"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});

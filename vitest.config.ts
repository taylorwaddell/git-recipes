import { dirname, resolve } from "node:path";

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "."),
    },
  },
});

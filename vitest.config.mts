import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Integration specs talk to a real CognoDB instance over the network; a single
    // round trip to the free tier costs roughly 800ms.
    testTimeout: 45_000,
    hookTimeout: 60_000,
    // The free c0 tier is one small burstable instance. Running specs serially
    // keeps the suite from competing with itself for CPU credits.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
});

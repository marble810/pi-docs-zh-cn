import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    exclude: ["node_modules", ".svelte-kit", "build", ".work", "tests/e2e/**"]
  }
});

import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: undefined,
      strict: true
    }),
    prerender: {
      handleHttpError: ({ status }) => {
        // Ignore 404s from self-referencing trailing-slash links during prerender
        if (status === 404) return;
        throw new Error(`Prerender HTTP ${status}`);
      },
      handleUnseenRoutes: "warn"
    },
    paths: {
      base: process.env.BASE_PATH ?? ""
    }
  }
};

export default config;

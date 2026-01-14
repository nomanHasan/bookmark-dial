import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  server: {
    port: 5740,
  },
  resolve: {
    alias: [
      // More specific alias first - environment-based Chrome API
      {
        find: "@/chromeApi",
        replacement: mode === "production"
          ? resolve(__dirname, "src/lib/chromeApi.prod.js")
          : resolve(__dirname, "src/lib/chromeApi.dev.js"),
      },
      // General src alias
      { find: "@", replacement: resolve(__dirname, "src") },
    ],
  },
  publicDir: "public",
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
      },
    },
  },
}));

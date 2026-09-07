import { defineConfig } from "vite";
import { cpSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "copy-content-collections",
      closeBundle() {
        cpSync(resolve("data"), resolve("dist/data"), { recursive: true });
        cpSync(resolve("assets"), resolve("dist/assets"), { recursive: true });
        cpSync(resolve("main.js"), resolve("dist/main.js"));
      },
    },
  ],
  build: {
    outDir: "dist",
  },
});

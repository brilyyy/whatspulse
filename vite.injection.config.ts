import { defineConfig } from "vite";
// @ts-expect-error type error without @types/node package
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "es2020",
    minify: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/injection/index.ts"),
      name: "WhatsPulseInjection",
      formats: ["iife"],
      fileName: () => "injection.bundle.js",
    },
    outDir: resolve(import.meta.dirname, "src-tauri/src/scripts"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});

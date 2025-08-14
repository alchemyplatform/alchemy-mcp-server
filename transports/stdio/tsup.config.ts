import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  dts: false,
  clean: true,
  minify: true,
  banner: {
    js: '#!/usr/bin/env node'
  },
  esbuildOptions(options) {
    options.bundle = true;
    options.platform = 'node';
    // Ensure core source is inlined into the stdio bundle (no external core)
    options.external = [];
  },
});


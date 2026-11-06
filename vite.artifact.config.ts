/**
 * Single-file build (JS, CSS and fonts inlined) for sharing as a claude.ai
 * artifact. The Vercel build stays the normal multi-file one.
 */
import { defineConfig, mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import base from './vite.config';

export default mergeConfig(
  base,
  defineConfig({
    base: './',
    plugins: [viteSingleFile()],
    build: { outDir: 'dist-artifact', sourcemap: false, assetsInlineLimit: 100_000_000 },
  }),
);

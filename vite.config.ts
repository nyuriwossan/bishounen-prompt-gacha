import { defineConfig } from 'vite';

// GitHub Pages のサブパス（/bishounen-prompt-gacha/）でも壊れないよう、相対パスで出力する。
export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 120000 }
} as never);

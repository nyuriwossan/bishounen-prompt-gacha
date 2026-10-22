import { defineConfig } from 'vite';

// GitHub Pages のサブパス（/bishounen-prompt-gacha/）でも壊れないよう、相対パスで出力する。
export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  // 辞書（約2,000候補）が JS の大半を占め、起動時にすべて使うため分割しない。2026-10 増築で 500 kB を超えたので、警告の上限だけ上げる（gzip で約172 kB）
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, sourcemap: false, chunkSizeWarningLimit: 650 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 120000, setupFiles: ['tests/setup.ts'] }
} as never);

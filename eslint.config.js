import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.dbg/**'] },
  { files: ['scripts/**/*.mjs', 'tests/browser/**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', document: 'readonly', window: 'readonly', navigator: 'readonly', location: 'readonly', Storage: 'readonly', DOMException: 'readonly', getComputedStyle: 'readonly', setTimeout: 'readonly', URL: 'readonly' } } },
  { files: ['public/sw.js'], languageOptions: { globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly' } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
);

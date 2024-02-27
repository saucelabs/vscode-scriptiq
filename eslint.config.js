const ts = require('typescript-eslint');
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    ignores: ['out/**', 'dist/**', 'media/**', '.vscode-test/**'],
  },
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    rules: {
      // Long term, we should disallow the use of 'any'. But for now, we'll just
      // warn, and fix them as we go.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
    languageOptions: {
      globals: {
        __dirname: true,
        console: true,
        exports: true,
        module: true,
        require: true,
      },
    },
  },
);

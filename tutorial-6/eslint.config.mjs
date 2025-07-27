import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['dist/**'] },
  { files: ['**/*.{ts}'] },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig, // Disables ESLint rules that conflict with Prettier
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error', // Treat Prettier errors as ESLint errors
      'max-len': 'off',
      'no-underscore-dangle': 'off',
      'arrow-body-style': 'off',
      'jsdoc/newline-after-description': 'off',
    },
  },
];

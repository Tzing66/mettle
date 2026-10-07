// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/db/migrations/*', 'supabase/functions/**'],
  },
  {
    // jest.mock factories must use require() and run before imports.
    files: ['**/__tests__/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off', 'import/first': 'off' },
  },
]);

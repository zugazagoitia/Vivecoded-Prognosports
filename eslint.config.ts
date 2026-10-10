import prettier from 'eslint-config-prettier/flat'
import js from '@eslint/js'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginVue from 'eslint-plugin-vue'
import vueA11y from 'eslint-plugin-vuejs-accessibility'
import tseslint from 'typescript-eslint'

const FETCH_MSG = 'Usa el cliente de src/api/ en lugar de fetch directo.'

export default tseslint.config(
  { ignores: ['**/*.d.ts', 'dist/**', 'node_modules/**', 'docs/**', 'coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...pluginVue.configs['flat/recommended'],
  ...vueA11y.configs['flat/recommended'],

  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // §23.3: v-html only with an exception comment (eslint-disable) and sanitized HTML.
      'vue/no-v-html': 'error',
      // Network access goes through src/api/ only.
      'no-restricted-globals': ['error', { name: 'fetch', message: FETCH_MSG }],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'fetch', message: FETCH_MSG },
        { object: 'globalThis', property: 'fetch', message: FETCH_MSG },
      ],
      // i18n (T5): warn only, to limit false positives.
      'vue/no-bare-strings-in-template': 'warn',
    },
  },

  {
    files: ['src/api/**'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },

  {
    files: ['**/*.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,

  // Must come last: turns off rules already covered by oxlint.
  ...pluginOxlint.configs['flat/recommended'],
)

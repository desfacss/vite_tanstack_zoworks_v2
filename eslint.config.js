import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'public/**',
    ]
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // =================================================================
      // RELAXED RULES - Legacy code compatibility
      // These can be gradually enabled as code is cleaned up
      // =================================================================
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-case-declarations': 'warn',
      'no-prototype-builtins': 'warn',
      'no-irregular-whitespace': 'off',
      'no-sparse-arrays': 'warn',
      'no-constant-condition': 'warn',
      'prefer-const': 'warn',

      // React hooks - warnings for now due to legacy patterns
      'react-hooks/rules-of-hooks': 'warn',  // Should be error, but too many legacy issues
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // =================================================================
  // CRITICAL: Core Independence Protection
  // This ensures the plug-and-play architecture is maintained
  // =================================================================
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/modules/*', '../modules/*', '../../modules/*', '../../../modules/*'],
            message: '🚫 ARCHITECTURE VIOLATION: Core must not import from modules. Use the registry pattern instead.'
          },
          {
            group: ['**/modules/**'],
            message: '🚫 ARCHITECTURE VIOLATION: Core must not import from modules. Use the registry pattern instead.'
          }
        ]
      }]
    }
  }
);

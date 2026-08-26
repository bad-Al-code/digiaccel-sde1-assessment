import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),

  ...nextVitals,
  ...nextTs,

  {
    name: 'project/conventions',
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    name: 'project/layer-boundaries/services',
    files: ['src/server/modules/**/*.service.ts', 'src/server/modules/**/services/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'mongoose',
              message: 'Services must not touch the ODM. Go through a repository (D-05).',
            },
          ],
          patterns: [
            {
              group: ['**/database/models/*', '@/server/database/models/*'],
              message: 'Models are reachable only from repositories (D-05).',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'project/layer-boundaries/controllers',
    files: ['src/server/modules/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'mongoose',
              message: 'Controllers must not touch the ODM. Call a service (D-05).',
            },
          ],
          patterns: [
            {
              group: [
                '**/database/models/*',
                '@/server/database/models/*',
                '**/*.repository',
                '@/server/modules/**/*.repository',
              ],
              message: 'Controllers call services, never repositories directly.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'project/layer-boundaries/client-cannot-import-server',
    files: ['src/client/**/*.ts', 'src/client/**/*.tsx', 'src/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '**/server/config/env*'],
              message:
                'Client code must never import server modules - env.ts reads secrets and would be bundled.',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'project/scripts',
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-restricted-imports': 'off',
    },
  },

  prettier,
]);

export default eslintConfig;

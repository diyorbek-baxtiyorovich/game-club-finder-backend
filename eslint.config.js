import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'var/**'] },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // TypeScript's type checker handles undefined identifiers with project types.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Express request typing requires global namespace augmentation.
      '@typescript-eslint/no-namespace': 'off',
    },
  },
);

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'vendor', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // tsc already enforces noUnusedLocals/noUnusedParameters; keep the lint
      // copy quiet so the two do not disagree over the same line.
      '@typescript-eslint/no-unused-vars': 'off',

      // The codebase leans on `any` in a few Phaser and Yandex SDK seams where
      // the upstream types are untyped or wrong. Flag them, do not fail on them.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Web Audio throws when a node is stopped or disconnected twice, and
      // there is genuinely nothing to handle; empty blocks elsewhere are still
      // an error.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Real bug catchers, worth failing over.
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'require-atomic-updates': 'error',
      // Silent data loss: an unawaited promise in a scene lifecycle hook.
      'no-async-promise-executor': 'error',
    },
  },
  {
    // Tests reach into globals and stub browser APIs by design.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);

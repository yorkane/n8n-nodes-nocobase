module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-require-imports': 'warn',
    'no-inner-declarations': 'warn',
    'spaced-comment': ['error', 'always', {
      'line': {
        'markers': ['/'],
        'exceptions': ['-', '+'],
      },
      'block': {
        'markers': ['!'],
        'exceptions': ['*'],
        'balanced': true,
      },
    }],
    'no-restricted-syntax': [
      'error',
      {
        'selector': 'Comment',
        'message': '请使用中文注释，除非是代码示例或特定术语',
      },
    ],
  },
  env: {
    node: true,
    es6: true,
  },
  ignorePatterns: ['package.json', 'package-lock.json', 'pnpm-lock.yaml'],
}; 
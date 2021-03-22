module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['node_modules', 'dist', 'coverage', '__tests__'],
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'airbnb-typescript/base',
  ],
  rules: {
    // Always using named exports is clearer and more consistent
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',

     // Regionize is not actually parallelizable, awaits are used so loops yield to UI events
    'no-await-in-loop': 'off',

    // Copy-pasted whole rule to re-enable ForOfStatement. for...of is well supported natively,
    // so warning about regenerator-runtime is not relevant.
    // https://github.com/airbnb/javascript/blob/63098cbb6c05376dbefc9a91351f5727540c1ce1/packages/eslint-config-airbnb-base/rules/style.js#L339 
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],

    // Each caller should make its own judgment on readability
    'arrow-body-style': 'off',

    // Regionize make heavy use of utilities that mutate properties of a passed-in dom node
    'no-param-reassign': ['error', { 'props': false }],

    // I just think 'else' belongs on its own line
    '@typescript-eslint/brace-style': ['error', 'stroustrup'],
  }
};

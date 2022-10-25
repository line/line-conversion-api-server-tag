module.exports = {
  env: {
    node: true,
    commonjs: true,
    es6: true,
    mocha: true
  },
  parser: "@babel/eslint-parser",
  parserOptions: {
    babelOptions: {
      babelrc: true
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
  ]
};

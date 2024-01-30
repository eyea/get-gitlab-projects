module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
    es2021: true,
   },
  parserOptions: {
    ecmaVersion: 2020, // 或者其它你正在使用的ECMAScript版本
    sourceType: 'module', // 对于使用ESM import/export语句的文件
  },
  "extends": [
    "plugin:@afuteam/fe/js"
  ],
  "plugins": ["@afuteam/fe"]
}
var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    template: './src/template_code.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist') // todo: create release scripts
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      }
    ]
  }
};

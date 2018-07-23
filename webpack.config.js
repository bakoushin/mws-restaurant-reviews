const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

module.exports = (env, argv) => ({
  context: path.resolve(__dirname, 'src'),
  entry: {
    main: './js/main.js',
    restaurant_info: './js/restaurant_info.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist')
    //filename: '[name].[chunkhash].js'
  },
  //devtool: 'cheap-module-eval-source-map',
  devServer: {
    //stats: 'errors-only',
    compress: true
  },
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
          // {
          //   loader: 'style-loader',
          //   options: {
          //     hmr: argv.mode !== 'production'
          //   }
          // },
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader',
            options: {
              //          sourceMap: true,
              importLoaders: 1
            }
          },
          {
            loader: 'sass-loader',
            options: {
              //        sourceMap: true
            }
          }
        ]
      }
    ]
  },
  plugins: [
    argv.mode === 'production' ? new CleanWebpackPlugin(['dist']) : _ => _,
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
      chunks: ['main'],
      inlineSource: '.css$'
    }),
    new HtmlWebpackPlugin({
      filename: 'restaurant.html',
      template: './restaurant.html',
      chunks: ['restaurant_info']
      // inlineSource: '.(js|css)$'
    }),
    new HtmlWebpackInlineSourcePlugin()
  ]
});

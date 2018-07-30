const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const devMode = argv.mode === 'development';
  const htmlMinifierOptions = {
    useShortDoctype: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeStyleLinkTypeAttributes: true
  };
  return {
    context: path.resolve(__dirname, 'src'),
    entry: {
      main: './js/main.js',
      restaurant_info: './js/restaurant_info.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: devMode ? '[name].js' : '[name].[contenthash].js'
    },
    devtool: devMode ? 'cheap-module-eval-source-map' : false,
    devServer: {
      compress: true
    },
    module: {
      rules: [
        {
          test: /\.s?css$/,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: devMode,
                importLoaders: 2
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: devMode,
                config: {
                  ctx: {
                    cssnano: {
                      devMode,
                      preset: ['default', { discardComments: { removeAll: true } }]
                    },
                    mqpacker: { devMode },
                    autoprefixer: { devMode }
                  }
                }
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: devMode
              }
            }
          ]
        },
        {
          test: /\.svg/,
          use: {
            loader: 'svg-url-loader',
            options: {
              iesafe: true
            }
          }
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin(['dist'], {
        beforeEmit: true
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css'
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: './index.html',
        chunks: ['main'],
        minify: devMode ? false : htmlMinifierOptions
        //inlineSource: ".css$"
      }),
      new HtmlWebpackPlugin({
        filename: 'restaurant.html',
        template: './restaurant.html',
        chunks: ['restaurant_info'],
        minify: devMode ? false : htmlMinifierOptions
        // inlineSource: '.(js|css)$'
      }),
      //new HtmlWebpackInlineSourcePlugin()
      new ServiceWorkerWebpackPlugin({
        entry: path.join(__dirname, 'src/js/sw.js')
      }),
      new CopyWebpackPlugin([
        'manifest.json',
        { from: 'icons', to: 'icons/' },
        { from: 'assets/placeholder-image', to: 'assets/' },
        { from: path.join(__dirname, 'img'), to: 'img/' }
      ])
    ]
  };
};

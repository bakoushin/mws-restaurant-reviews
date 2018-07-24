const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

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
      path: path.resolve(__dirname, 'dist')
      //filename: '[name].[chunkhash].js'
    },
    devtool: devMode ? 'cheap-module-eval-source-map' : false,
    devServer: {
      //stats: 'errors-only',
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
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin(['dist'], {
        beforeEmit: true
      }),
      new MiniCssExtractPlugin(),
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
      })
      //new HtmlWebpackInlineSourcePlugin()
    ]
  };
};

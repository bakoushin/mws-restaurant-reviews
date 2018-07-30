module.exports = ({ file, options, env }) => ({
  plugins: {
    autoprefixer: options.autoprefixer.devMode ? false : options.autoprefixer,
    'css-mqpacker': options.mqpacker.devMode ? false : options.mqpacker,
    cssnano: options.cssnano.devMode ? false : options.cssnano
  }
});

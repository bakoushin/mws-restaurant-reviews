module.exports = ({ file, options, env }) => ({
  plugins: {
    autoprefixer: options.autoprefixer.devMode ? false : options.autoprefixer,
    cssnano: options.cssnano.devMode ? false : options.cssnano
  }
});

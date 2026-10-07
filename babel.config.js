module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Inline drizzle's .sql migrations into the bundle.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};

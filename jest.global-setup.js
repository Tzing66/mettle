// Engine date logic uses local time; pin it so tests behave the same everywhere.
module.exports = () => {
  process.env.TZ = 'UTC';
};

const levels = { info: 'INFO', warn: 'WARN', error: 'ERROR' };

function log(level, message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${levels[level] || 'LOG'} ${message}`);
}

module.exports = { log };

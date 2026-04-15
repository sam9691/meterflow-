const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// format: mf_live_<64 hex chars> or mf_test_<64 hex chars>
function generateApiKey(env = 'live') {
  const prefix = env === 'test' ? 'mf_test_' : 'mf_live_';
  return `${prefix}${crypto.randomBytes(32).toString('hex')}`;
}

// bcrypt hash for secure storage - slow by design
async function hashApiKey(key) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(key, salt);
}

async function compareApiKey(raw, hashed) {
  return bcrypt.compare(raw, hashed);
}

// sha256 for fast lookups - we index this in mongo
function generateKeyLookupHash(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// show first 12 chars + stars + last 4 in the UI
function maskApiKey(key) {
  if (!key || key.length < 20) return '***';
  return `${key.substring(0, 12)}${'*'.repeat(16)}${key.slice(-4)}`;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  compareApiKey,
  generateKeyLookupHash,
  maskApiKey,
};

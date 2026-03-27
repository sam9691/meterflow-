const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generates a secure API key with prefix
 * Format: mf_live_<random> or mf_test_<random>
 */
const generateApiKey = (environment = 'live') => {
  const prefix = environment === 'test' ? 'mf_test_' : 'mf_live_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
};

/**
 * Hash an API key for secure storage
 */
const hashApiKey = async (apiKey) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(apiKey, salt);
};

/**
 * Compare raw API key with stored hash
 */
const compareApiKey = async (rawKey, hashedKey) => {
  return bcrypt.compare(rawKey, hashedKey);
};

/**
 * Generate a short display version of the key (for UI)
 * Shows first 12 chars + masked middle + last 4 chars
 */
const maskApiKey = (apiKey) => {
  if (!apiKey || apiKey.length < 20) return '***';
  const prefix = apiKey.substring(0, 12);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}${'*'.repeat(16)}${suffix}`;
};

/**
 * Generate a SHA-256 lookup hash for fast key lookup
 * (bcrypt is slow for lookup, so we store a fast hash for indexing)
 */
const generateKeyLookupHash = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

module.exports = {
  generateApiKey,
  hashApiKey,
  compareApiKey,
  maskApiKey,
  generateKeyLookupHash,
};

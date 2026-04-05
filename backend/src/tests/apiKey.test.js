const {
  generateApiKey,
  hashApiKey,
  compareApiKey,
  maskApiKey,
  generateKeyLookupHash,
} = require('../utils/apiKeyGenerator');

describe('API Key Generator', () => {
  describe('generateApiKey', () => {
    it('should generate a live key with correct prefix', () => {
      const key = generateApiKey('live');
      expect(key).toMatch(/^mf_live_[a-f0-9]{64}$/);
    });

    it('should generate a test key with correct prefix', () => {
      const key = generateApiKey('test');
      expect(key).toMatch(/^mf_test_[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey and compareApiKey', () => {
    it('should hash and verify a key correctly', async () => {
      const rawKey = generateApiKey();
      const hashed = await hashApiKey(rawKey);

      expect(hashed).not.toBe(rawKey);
      expect(hashed.length).toBeGreaterThan(50);

      const isValid = await compareApiKey(rawKey, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject wrong key', async () => {
      const rawKey = generateApiKey();
      const hashed = await hashApiKey(rawKey);
      const isValid = await compareApiKey('wrong_key', hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('maskApiKey', () => {
    it('should mask the middle of the key', () => {
      const key = 'mf_live_abcdef1234567890abcdef1234567890';
      const masked = maskApiKey(key);
      expect(masked).toMatch(/^mf_live_abcd\*+\w{4}$/);
      expect(masked).not.toBe(key);
    });
  });

  describe('generateKeyLookupHash', () => {
    it('should generate consistent SHA-256 hash', () => {
      const key = generateApiKey();
      const hash1 = generateKeyLookupHash(key);
      const hash2 = generateKeyLookupHash(key);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(generateKeyLookupHash(key1)).not.toBe(generateKeyLookupHash(key2));
    });
  });
});

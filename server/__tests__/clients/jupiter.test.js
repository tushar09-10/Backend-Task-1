const { normalizeToken } = require('../../clients/jupiterClient');

describe('jupiterClient', () => {
  describe('normalizeToken', () => {
    test('normalizes valid token data', () => {
      const rawToken = {
        address: 'token789',
        name: 'Jupiter Token',
        symbol: 'JUP',
        decimals: 6,
        logoURI: 'https://example.com/logo.png',
        verified: true
      };

      const normalized = normalizeToken(rawToken);

      expect(normalized.tokenAddress).toBe('token789');
      expect(normalized.name).toBe('Jupiter Token');
      expect(normalized.symbol).toBe('JUP');
      expect(normalized.decimals).toBe(6);
      expect(normalized.logoUri).toBe('https://example.com/logo.png');
      expect(normalized.verified).toBe(true);
      expect(normalized.source).toBe('jupiter');
    });

    test('handles missing optional fields', () => {
      const rawToken = {
        address: 'tokenABC'
      };

      const normalized = normalizeToken(rawToken);

      expect(normalized.name).toBe('Unknown');
      expect(normalized.symbol).toBe('???');
      expect(normalized.decimals).toBe(9);
      expect(normalized.logoUri).toBeNull();
      expect(normalized.verified).toBe(false);
    });

    test('returns null for invalid input', () => {
      expect(normalizeToken(null)).toBeNull();
      expect(normalizeToken({})).toBeNull();
      expect(normalizeToken({ name: 'Test' })).toBeNull();
    });
  });
});

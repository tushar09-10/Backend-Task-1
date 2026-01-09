const { normalizePair } = require('../../clients/dexscreenerClient');

describe('dexscreenerClient', () => {
  describe('normalizePair', () => {
    test('normalizes valid pair data', () => {
      const rawPair = {
        pairAddress: '0x123',
        baseToken: {
          address: 'token123',
          name: 'Test Token',
          symbol: 'TEST'
        },
        priceUsd: '1.234',
        liquidity: { usd: 50000 },
        volume: { h24: 100000, h6: 40000, h1: 5000 },
        priceChange: { h1: 2.5, h24: 10.2, w1: 25.0 },
        fdv: 1000000,
        dexId: 'raydium',
        chainId: 'solana'
      };

      const normalized = normalizePair(rawPair);

      expect(normalized.pairAddress).toBe('0x123');
      expect(normalized.tokenAddress).toBe('token123');
      expect(normalized.name).toBe('Test Token');
      expect(normalized.symbol).toBe('TEST');
      expect(normalized.priceUsd).toBe(1.234);
      expect(normalized.liquidity).toBe(50000);
      expect(normalized.volume24h).toBe(100000);
      expect(normalized.priceChange1h).toBe(2.5);
      expect(normalized.marketCap).toBe(1000000);
      expect(normalized.source).toBe('dexscreener');
    });

    test('handles missing optional fields', () => {
      const rawPair = {
        pairAddress: '0x456',
        baseToken: {
          address: 'token456'
        }
      };

      const normalized = normalizePair(rawPair);

      expect(normalized.name).toBe('Unknown');
      expect(normalized.symbol).toBe('???');
      expect(normalized.priceUsd).toBe(0);
      expect(normalized.liquidity).toBe(0);
      expect(normalized.volume24h).toBe(0);
    });

    test('returns null for invalid input', () => {
      expect(normalizePair(null)).toBeNull();
      expect(normalizePair({})).toBeNull();
      expect(normalizePair({ pairAddress: '123' })).toBeNull();
    });
  });
});

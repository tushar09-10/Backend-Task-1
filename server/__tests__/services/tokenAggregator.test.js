const { filterAndSort, detectSignificantChanges } = require('../../services/tokenAggregator');

describe('tokenAggregator', () => {
  const mockTokens = [
    {
      tokenAddress: 'addr1',
      name: 'Token A',
      symbol: 'TOKA',
      priceUsd: 1.5,
      volume24h: 50000,
      volume1h: 2000,
      priceChange1h: 5.2,
      priceChange24h: 12.5,
      priceChange7d: 25.0,
      marketCap: 1000000,
      liquidity: 100000
    },
    {
      tokenAddress: 'addr2',
      name: 'Token B',
      symbol: 'TOKB',
      priceUsd: 0.05,
      volume24h: 150000,
      volume1h: 8000,
      priceChange1h: -2.1,
      priceChange24h: -8.3,
      priceChange7d: 15.0,
      marketCap: 500000,
      liquidity: 200000
    },
    {
      tokenAddress: 'addr3',
      name: 'Token C',
      symbol: 'TOKC',
      priceUsd: 0.001,
      volume24h: 25000,
      volume1h: 500,
      priceChange1h: 0.5,
      priceChange24h: 2.1,
      priceChange7d: -5.0,
      marketCap: 2000000,
      liquidity: 50000
    }
  ];

  describe('filterAndSort', () => {
    test('sorts by volume24h by default', () => {
      const result = filterAndSort(mockTokens, {});
      expect(result.tokens[0].symbol).toBe('TOKB');
      expect(result.tokens[1].symbol).toBe('TOKA');
    });

    test('sorts by priceChange for 24h timeframe', () => {
      const result = filterAndSort(mockTokens, { sortBy: 'priceChange', timeFrame: '24h' });
      expect(result.tokens[0].symbol).toBe('TOKA');
    });

    test('sorts by priceChange for 1h timeframe', () => {
      const result = filterAndSort(mockTokens, { sortBy: 'priceChange', timeFrame: '1h' });
      expect(result.tokens[0].symbol).toBe('TOKA');
    });

    test('sorts by marketCap', () => {
      const result = filterAndSort(mockTokens, { sortBy: 'marketCap' });
      expect(result.tokens[0].symbol).toBe('TOKC');
    });

    test('applies limit correctly', () => {
      const result = filterAndSort(mockTokens, { limit: 2 });
      expect(result.tokens).toHaveLength(2);
      expect(result.nextCursor).toBe('addr1');
    });

    test('handles cursor-based pagination', () => {
      // After sorting by volume: TOKB (150k), TOKA (50k), TOKC (25k)
      // cursor=addr2 means start AFTER addr2 (TOKB), so we get TOKA and TOKC
      const result = filterAndSort(mockTokens, { limit: 2, cursor: 'addr2' });
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].symbol).toBe('TOKA');
      expect(result.tokens[1].symbol).toBe('TOKC');
      // nextCursor is addr3 because we returned exactly `limit` items
      expect(result.nextCursor).toBe('addr3');
    });

    test('returns total count', () => {
      const result = filterAndSort(mockTokens, { limit: 1 });
      expect(result.total).toBe(3);
    });
  });

  describe('detectSignificantChanges', () => {
    test('detects price increases above threshold', () => {
      const oldTokens = [{ tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 100 }];
      const newTokens = [{ tokenAddress: 'addr1', priceUsd: 1.05, volume1h: 100 }];

      const changes = detectSignificantChanges(oldTokens, newTokens, 0.02, 1.5);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('price');
      expect(changes[0].direction).toBe('up');
    });

    test('detects price decreases above threshold', () => {
      const oldTokens = [{ tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 100 }];
      const newTokens = [{ tokenAddress: 'addr1', priceUsd: 0.95, volume1h: 100 }];

      const changes = detectSignificantChanges(oldTokens, newTokens, 0.02, 1.5);

      expect(changes).toHaveLength(1);
      expect(changes[0].direction).toBe('down');
    });

    test('detects volume spikes', () => {
      const oldTokens = [{ tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 100 }];
      const newTokens = [{ tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 200 }];

      const changes = detectSignificantChanges(oldTokens, newTokens, 0.02, 1.5);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('volume_spike');
      expect(changes[0].ratio).toBe(2);
    });

    test('ignores changes below threshold', () => {
      const oldTokens = [{ tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 100 }];
      const newTokens = [{ tokenAddress: 'addr1', priceUsd: 1.01, volume1h: 110 }];

      const changes = detectSignificantChanges(oldTokens, newTokens, 0.02, 1.5);

      expect(changes).toHaveLength(0);
    });

    test('handles new tokens not in old list', () => {
      const oldTokens = [{ tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 100 }];
      const newTokens = [
        { tokenAddress: 'addr1', priceUsd: 1.0, volume1h: 100 },
        { tokenAddress: 'addr2', priceUsd: 2.0, volume1h: 200 }
      ];

      const changes = detectSignificantChanges(oldTokens, newTokens, 0.02, 1.5);

      expect(changes).toHaveLength(0);
    });
  });
});

const dexscreener = require('../clients/dexscreenerClient');
const jupiter = require('../clients/jupiterClient');
const cache = require('../utils/redisClient');

const CACHE_KEY = 'tokens:aggregated';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 15;

let inMemoryCache = null;
let lastFetchTime = 0;

async function fetchAndAggregate() {
  console.log('[aggregator] fetching fresh data from APIs');

  const [dexPairs, jupTokens] = await Promise.all([
    dexscreener.getTrendingTokens(),
    jupiter.getKnownTokens()
  ]);

  const jupiterMap = new Map();
  for (const tok of jupTokens) {
    const normalized = jupiter.normalizeToken(tok);
    if (normalized) {
      jupiterMap.set(normalized.tokenAddress, normalized);
    }
  }

  const tokenMap = new Map();

  for (const pair of dexPairs) {
    const normalized = dexscreener.normalizePair(pair);
    if (!normalized) continue;

    const existing = tokenMap.get(normalized.tokenAddress);

    if (existing) {
      existing.liquidity += normalized.liquidity;
      existing.volume24h += normalized.volume24h;
      existing.volume1h += normalized.volume1h;
      if (normalized.updatedAt > existing.updatedAt) {
        existing.priceUsd = normalized.priceUsd;
        existing.priceChange1h = normalized.priceChange1h;
        existing.priceChange24h = normalized.priceChange24h;
        existing.updatedAt = normalized.updatedAt;
      }
    } else {
      const jupMeta = jupiterMap.get(normalized.tokenAddress);
      if (jupMeta) {
        normalized.logoUri = jupMeta.logoUri;
        normalized.verified = jupMeta.verified;
      }
      tokenMap.set(normalized.tokenAddress, normalized);
    }
  }

  const aggregatedTokens = Array.from(tokenMap.values());
  console.log(`[aggregator] aggregated ${aggregatedTokens.length} tokens`);

  return aggregatedTokens;
}

async function getTokens(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await cache.getCached(CACHE_KEY);
    if (cached) {
      console.log('[aggregator] serving from redis cache');
      return cached;
    }

    const memCacheAge = Date.now() - lastFetchTime;
    if (inMemoryCache && memCacheAge < CACHE_TTL * 1000) {
      console.log('[aggregator] serving from memory cache');
      return inMemoryCache;
    }
  }

  const tokens = await fetchAndAggregate();

  await cache.setCached(CACHE_KEY, tokens, CACHE_TTL);
  inMemoryCache = tokens;
  lastFetchTime = Date.now();

  return tokens;
}

function filterAndSort(tokens, { sortBy = 'volume24h', timeFrame = '24h', limit = 20, cursor = null }) {
  let filtered = [...tokens];

  const priceChangeField = timeFrame === '1h' ? 'priceChange1h'
    : timeFrame === '7d' ? 'priceChange7d'
    : 'priceChange24h';

  const volumeField = timeFrame === '1h' ? 'volume1h' : 'volume24h';

  if (sortBy === 'volume') {
    filtered.sort((a, b) => b[volumeField] - a[volumeField]);
  } else if (sortBy === 'priceChange') {
    filtered.sort((a, b) => b[priceChangeField] - a[priceChangeField]);
  } else if (sortBy === 'marketCap') {
    filtered.sort((a, b) => b.marketCap - a.marketCap);
  } else {
    filtered.sort((a, b) => b.volume24h - a.volume24h);
  }

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = filtered.findIndex(t => t.tokenAddress === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const paginated = filtered.slice(startIndex, startIndex + limit);
  const nextCursor = paginated.length === limit ? paginated[paginated.length - 1].tokenAddress : null;

  return {
    tokens: paginated,
    nextCursor,
    total: filtered.length
  };
}

function detectSignificantChanges(oldTokens, newTokens, priceThreshold = 0.02, volumeThreshold = 1.5) {
  const oldMap = new Map(oldTokens.map(t => [t.tokenAddress, t]));
  const changedTokens = [];

  for (const newToken of newTokens) {
    const oldToken = oldMap.get(newToken.tokenAddress);
    if (!oldToken) continue;

    const priceDelta = oldToken.priceUsd > 0
      ? Math.abs(newToken.priceUsd - oldToken.priceUsd) / oldToken.priceUsd
      : 0;

    const volumeRatio = oldToken.volume1h > 0
      ? newToken.volume1h / oldToken.volume1h
      : 0;

    // If either threshold is exceeded, include this token in the update
    if (priceDelta >= priceThreshold || volumeRatio >= volumeThreshold) {
      changedTokens.push(newToken);
    }
  }

  return changedTokens;
}

module.exports = {
  fetchAndAggregate,
  getTokens,
  filterAndSort,
  detectSignificantChanges
};

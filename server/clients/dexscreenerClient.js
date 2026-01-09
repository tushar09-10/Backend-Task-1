const { createHttpClient } = require('../utils/httpClient');

const baseURL = process.env.DEXSCREENER_BASE_URL || 'https://api.dexscreener.com';
const http = createHttpClient(baseURL);

async function searchTokens(query) {
  try {
    const { data } = await http.get('/latest/dex/search', {
      params: { q: query }
    });
    return data.pairs || [];
  } catch (err) {
    console.error('[dexscreener] search failed:', err.message);
    return [];
  }
}

async function getTokenPairs(tokenAddress) {
  try {
    const { data } = await http.get(`/latest/dex/tokens/${tokenAddress}`);
    return data.pairs || [];
  } catch (err) {
    console.error('[dexscreener] getTokenPairs failed:', err.message);
    return [];
  }
}

async function getTrendingTokens() {
  const queries = ['SOL', 'BONK', 'WIF', 'PEPE', 'DOGE', 'SHIB', 'FLOKI'];
  const allPairs = [];

  for (const q of queries) {
    const pairs = await searchTokens(q);
    allPairs.push(...pairs);
    await new Promise(r => setTimeout(r, 200));
  }

  return allPairs;
}

function normalizePair(pair) {
  if (!pair || !pair.baseToken) return null;

  return {
    pairAddress: pair.pairAddress,
    tokenAddress: pair.baseToken.address,
    name: pair.baseToken.name || 'Unknown',
    symbol: pair.baseToken.symbol || '???',
    priceUsd: parseFloat(pair.priceUsd) || 0,
    liquidity: pair.liquidity?.usd || 0,
    volume24h: pair.volume?.h24 || 0,
    volume6h: pair.volume?.h6 || 0,
    volume1h: pair.volume?.h1 || 0,
    priceChange1h: pair.priceChange?.h1 || 0,
    priceChange24h: pair.priceChange?.h24 || 0,
    priceChange7d: pair.priceChange?.w1 || 0,
    marketCap: pair.fdv || 0,
    dexId: pair.dexId || 'unknown',
    chainId: pair.chainId || 'solana',
    source: 'dexscreener',
    updatedAt: Date.now()
  };
}

module.exports = {
  searchTokens,
  getTokenPairs,
  getTrendingTokens,
  normalizePair
};

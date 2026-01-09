const { createHttpClient } = require('../utils/httpClient');

const baseURL = process.env.JUPITER_BASE_URL || 'https://lite-api.jup.ag';
const http = createHttpClient(baseURL);

async function searchTokens(query) {
  try {
    const { data } = await http.get('/tokens/v2/search', {
      params: { query }
    });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[jupiter] search failed:', err.message);
    return [];
  }
}

async function getKnownTokens() {
  const queries = ['SOL', 'BONK', 'WIF', 'PEPE'];
  const tokens = [];

  for (const q of queries) {
    const results = await searchTokens(q);
    tokens.push(...results);
    await new Promise(r => setTimeout(r, 150));
  }

  return tokens;
}

function normalizeToken(token) {
  if (!token || !token.address) return null;

  return {
    tokenAddress: token.address,
    name: token.name || 'Unknown',
    symbol: token.symbol || '???',
    decimals: token.decimals || 9,
    logoUri: token.logoURI || null,
    verified: token.verified || false,
    source: 'jupiter'
  };
}

module.exports = {
  searchTokens,
  getKnownTokens,
  normalizeToken
};

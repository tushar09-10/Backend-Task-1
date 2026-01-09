const aggregator = require('../services/tokenAggregator');

async function getTokens(req, res) {
  try {
    const { sortBy, timeFrame, limit, cursor } = req.query;

    const allTokens = await aggregator.getTokens();

    const result = aggregator.filterAndSort(allTokens, {
      sortBy: sortBy || 'volume24h',
      timeFrame: timeFrame || '24h',
      limit: parseInt(limit, 10) || 20,
      cursor: cursor || null
    });

    res.json({
      success: true,
      data: result.tokens,
      pagination: {
        nextCursor: result.nextCursor,
        total: result.total,
        returned: result.tokens.length
      }
    });
  } catch (err) {
    console.error('[controller] getTokens error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens'
    });
  }
}

async function getHealth(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}

module.exports = { getTokens, getHealth };

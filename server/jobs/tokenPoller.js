const aggregator = require('../services/tokenAggregator');
const socketService = require('../services/socketService');

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_SECONDS, 10) || 10;
const PRICE_THRESHOLD = parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 0.01;
const VOLUME_THRESHOLD = parseFloat(process.env.VOLUME_SPIKE_THRESHOLD) || 1.2;

let previousTokens = [];
let pollTimer = null;

async function poll() {
  try {
    const clients = socketService.getConnectedClients();
    if (clients === 0) {
      console.log('[poller] no clients connected, skipping');
      return;
    }

    console.log(`[poller] refreshing data for ${clients} connected client(s)`);

    const freshTokens = await aggregator.getTokens(true);

    if (previousTokens.length > 0) {
      const changes = aggregator.detectSignificantChanges(
        previousTokens,
        freshTokens,
        PRICE_THRESHOLD,
        VOLUME_THRESHOLD
      );

      if (changes.length > 0) {
        socketService.broadcastTokenUpdates(changes);
      }
    }

    // Always broadcast updated token data
    socketService.broadcastFullRefresh(freshTokens);

    previousTokens = freshTokens;
  } catch (err) {
    console.error('[poller] error:', err.message);
  }
}

function start() {
  console.log(`[poller] starting with ${POLL_INTERVAL}s interval`);
  pollTimer = setInterval(poll, POLL_INTERVAL * 1000);
  poll();
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('[poller] stopped');
  }
}

module.exports = { start, stop, poll };

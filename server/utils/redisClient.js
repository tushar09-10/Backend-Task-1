const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis = null;
let isConnected = false;

function getRedis() {
  if (redis) return redis;

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 5,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 200, 3000);
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some(e => err.message.includes(e));
    },
    lazyConnect: true
  });

  redis.on('connect', () => {
    isConnected = true;
    console.log('[redis] connected');
  });

  redis.on('error', (err) => {
    isConnected = false;
    console.error('[redis] connection error:', err.message);
  });

  redis.on('close', () => {
    isConnected = false;
    console.log('[redis] connection closed');
  });

  return redis;
}

async function tryConnect() {
  const client = getRedis();
  try {
    await client.connect();
  } catch (err) {
    console.warn('[redis] failed to connect, running without cache:', err.message);
  }
}

function isRedisAvailable() {
  return isConnected;
}

async function getCached(key) {
  if (!isConnected) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[redis] get error:', err.message);
    return null;
  }
}

async function setCached(key, value, ttlSeconds) {
  if (!isConnected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[redis] set error:', err.message);
  }
}

async function clearCache(pattern = '*') {
  if (!isConnected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('[redis] clear error:', err.message);
  }
}

module.exports = {
  getRedis,
  tryConnect,
  isRedisAvailable,
  getCached,
  setCached,
  clearCache
};

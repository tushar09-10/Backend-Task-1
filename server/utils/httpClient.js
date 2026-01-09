const axios = require('axios');
const axiosRetry = require('axios-retry').default;

function createHttpClient(baseURL, options = {}) {
  const client = axios.create({
    baseURL,
    timeout: options.timeout || 15000,
    headers: {
      'Accept': 'application/json',
      ...options.headers
    }
  });

  axiosRetry(client, {
    retries: 4,
    retryDelay: (retryCount) => {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`[http] retry #${retryCount}, waiting ${delay}ms`);
      return delay;
    },
    retryCondition: (error) => {
      const status = error.response?.status;
      return axiosRetry.isNetworkOrIdempotentRequestError(error) || status === 429 || status === 503;
    },
    onRetry: (retryCount, error, requestConfig) => {
      console.warn(`[http] retrying ${requestConfig.url}:`, error.message);
    }
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const url = err.config?.url || 'unknown';
      const status = err.response?.status || 'network';
      console.error(`[http] request failed: ${url} (${status})`);
      return Promise.reject(err);
    }
  );

  return client;
}

module.exports = { createHttpClient };

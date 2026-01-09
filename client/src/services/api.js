import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000
});

export async function fetchTokens({ sortBy = 'volume', timeFrame = '24h', limit = 20, cursor = null } = {}) {
  const params = { sortBy, timeFrame, limit };
  if (cursor) params.cursor = cursor;

  const { data } = await api.get('/api/tokens', { params });
  return data;
}

export default api;

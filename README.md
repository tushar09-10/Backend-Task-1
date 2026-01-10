# Token Aggregation Dashboard

A backend-focused real-time token dashboard that aggregates data from multiple DEX APIs, implements intelligent caching, and pushes targeted updates via WebSocket. Built to demonstrate scalable system design and efficient real-time communication patterns.

## What This Does

Instead of polling the frontend every few seconds (wasteful), this system:
1. Loads initial token data via REST
2. Monitors for significant price/volume changes in the background
3. Pushes only changed tokens via WebSocket
4. Caches aggressively to reduce API load

Why? Because real-world systems need to handle thousands of concurrent clients without hammering upstream APIs.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React Client  │◄────►│  Express Server │◄────►│     Redis       │
│   (Vite)        │ REST │  + Socket.io    │      │  (Cache Layer)  │
│                 │  WS  │                 │      └─────────────────┘
└─────────────────┘      └────────┬────────┘
                                  │
                      ┌───────────┼───────────┐
                      ▼           ▼           ▼
              ┌───────────┐ ┌─────────┐ ┌──────────┐
              │DexScreener│ │ Jupiter │ │GeckoTerm │
              │    API    │ │   API   │ │(planned) │
              └───────────┘ └─────────┘ └──────────┘
```

### Components

- **Express Backend**: REST API, WebSocket server, data aggregation
- **React Frontend**: Dashboard UI with real-time updates
- **Redis**: Primary cache layer (optional, falls back to in-memory)
- **Background Poller**: Monitors for significant token changes

## Data Flow

### Initial Load (REST)

1. Client connects and requests `GET /api/tokens?sortBy=volume&limit=20`
2. Server checks Redis cache
   - **Cache hit**: Return immediately (Redis TTL: 15 seconds)
   - **Cache miss**: Fetch from DexScreener + Jupiter APIs
3. Aggregate and normalize data from both sources
4. Store in Redis with TTL
5. Return paginated results to client

### Real-time Updates (WebSocket)

1. Background poller runs every 10 seconds (configurable)
2. Fetches fresh data (respects cache, only hits API when cache expires)
3. Compares new data vs previous snapshot
4. Detects significant changes based on thresholds:
   - **Price change**: ≥ 1% (default)
   - **Volume spike**: ≥ 1.2x (default, meaning 20% increase)
5. **Only broadcasts changed tokens** (not full data)
6. Client receives `token-updates` event and updates specific rows

**First poll exception**: On the very first poll (no previous snapshot), send full data to initialize state.

### Why This Design?

- **Bandwidth efficient**: Send ~5 changed tokens instead of 100+ every time
- **API friendly**: Cache prevents hammering DexScreener (300 req/min limit)
- **Scalable**: WebSocket connections are cheap; you can handle thousands

## Change Detection Strategy

Why thresholds? Because token prices fluctuate constantly. A 0.01% wiggle doesn't matter to traders. We only broadcast changes that matter.

### Price Change Detection

```javascript
const priceDelta = Math.abs(newPrice - oldPrice) / oldPrice;
if (priceDelta >= 0.01) { // 1% threshold
  // This is significant, broadcast it
}
```

**Percentage-based** means a $0.10 move on a $1 token (10%) is treated differently than $0.10 on a $100 token (0.1%).

### Volume Spike Detection

```javascript
const volumeRatio = newVolume / oldVolume;
if (volumeRatio >= 1.2) { // 20% spike
  // Sudden activity, broadcast it
}
```

**Ratio-based** catches sudden trading activity that might indicate news or whale movements.

## Caching Strategy

Three-tier approach:

1. **Redis (Primary)**
   - TTL: 15 seconds (configurable)
   - Shared across server instances
   - Survives server restarts

2. **In-Memory (Fallback)**
   - Used if Redis connection fails
   - Per-instance cache
   - TTL matches Redis

3. **Graceful Degradation**
   - If both fail, fetch directly from APIs
   - System continues working (just slower)

Why 15 seconds? DexScreener allows ~300 req/min. With 15s cache and 10s poll interval, we stay well under limits even with traffic spikes.

## WebSocket Events

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `token-updates` | Server → Client | Array of changed tokens | When price or volume thresholds exceeded |
| `tokens-refresh` | Server → Client | Full token array | First poll after client connects |

Client-side handling:
```javascript
socket.on('token-updates', (updatedTokens) => {
  // Merge updates into existing state
  // Apply flash animation to changed rows
});
```

## Rate Limiting & Resilience

- **Axios retry**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Request timeout**: 15 seconds
- **Polling skip**: If no WebSocket clients connected, skip external API calls
- **Caching**: Prevents thundering herd on cache expiration

## API Endpoints

### `GET /api/tokens`

Fetch paginated token list.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sortBy` | string | `volume` | Sort field: `volume`, `priceChange`, `marketCap` |
| `timeFrame` | string | `24h` | Time window: `1h`, `24h`, `7d` |
| `limit` | number | `20` | Results per page |
| `cursor` | string | `null` | Token address for pagination |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tokenAddress": "...",
      "symbol": "DOGE",
      "name": "Dogecoin",
      "priceUsd": 0.072,
      "priceChange24h": 5.2,
      "volume24h": 15000000,
      "marketCap": 10000000000,
      "liquidity": 500000
    }
  ],
  "pagination": {
    "nextCursor": "So11111...",
    "total": 150,
    "returned": 20
  }
}
```

### `GET /health`

Health check for load balancers.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T05:00:00.000Z"
}
```

## Project Structure

```
/server
  /clients          # API wrappers (DexScreener, Jupiter)
  /controllers      # Request handlers
  /services         # Business logic (aggregation, WebSocket)
  /routes           # Express routes
  /jobs             # Background poller
  /utils            # Redis, HTTP client
  /__tests__        # Jest unit tests
  app.js            # Express config
  server.js         # Entry point

/client
  /src
    /components     # React UI components
    /services       # API & Socket clients
    /utils          # Formatters (price, volume)
    App.jsx
    main.jsx
  index.html
```

## Getting Started

### Prerequisites

- **Node.js 18+** (use `nvm` for version management)
- **Redis** (optional but recommended, install via Docker or locally)

### Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env (see Environment Variables section)
npm install
npm run dev
```

Server runs on `http://localhost:3001`

### Frontend Setup

```bash
cd client
cp .env.example .env
# Edit .env (set VITE_API_URL if backend is not on localhost:3001)
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Running Tests

```bash
cd server
npm test
```

## Environment Variables

### Server (`server/.env`)

**Required:**
```bash
PORT=3001
CLIENT_ORIGIN=http://localhost:5173  # Frontend URL for CORS
```

**Optional (with defaults):**
```bash
# Redis
REDIS_URL=redis://localhost:6379

# Caching
CACHE_TTL_SECONDS=15              # How long to cache aggregated data

# Background Polling
POLL_INTERVAL_SECONDS=10          # How often to check for changes

# Change Detection Thresholds
PRICE_CHANGE_THRESHOLD=0.01       # 1% price change triggers update
VOLUME_SPIKE_THRESHOLD=1.2        # 20% volume spike triggers update

# External API URLs (rarely need to change)
DEXSCREENER_BASE_URL=https://api.dexscreener.com
JUPITER_BASE_URL=https://lite-api.jup.ag
```

### Client (`client/.env`)

```bash
# Backend API URL
# Leave empty for same-origin in dev
# Set to deployed backend URL in production
VITE_API_URL=

# WebSocket URL (usually same as API URL)
VITE_SOCKET_URL=
```

### Setup Example

```bash
# Server
cd server
cp .env.example .env
# Open .env and set CLIENT_ORIGIN=http://localhost:5173

# Client
cd ../client
cp .env.example .env
# Leave VITE_API_URL empty for local dev
# For production, set VITE_API_URL=https://your-backend.railway.app
```

## CORS Explanation

The server uses a **dynamic CORS configuration** to avoid the classic "wildcard with credentials" error.

**How it works:**
- If `CLIENT_ORIGIN` is set in `.env`, only that origin is allowed
- If not set, the requesting origin is reflected back (development mode)
- Credentials (cookies) are always enabled

**Why dynamic?**
Browser security blocks `Access-Control-Allow-Origin: *` when credentials are enabled. By reflecting the requesting origin, we support development flexibility while maintaining security in production.

**Troubleshooting:**

1. **"CORS policy: The request client is not allowed"**
   - Check `CLIENT_ORIGIN` in `server/.env` matches frontend URL exactly
   - For dev: `http://localhost:5173` (no trailing slash)
   - Restart server after changing `.env`

2. **WebSocket connection fails**
   - Ensure `VITE_SOCKET_URL` in client `.env` matches backend URL
   - Check browser console for CORS errors

## Deployment

### Backend (Railway)

1. Create new Railway project from GitHub repo
2. Set root directory: `/server`
3. Add Redis database (Railway addon)
4. Set environment variables:
   ```
   NODE_ENV=production
   CLIENT_ORIGIN=https://your-frontend.vercel.app
   REDIS_URL=<auto-populated by Railway>
   ```
5. Deploy (Railway auto-detects Node.js)

Railway config is in `server/railway.json`:
```json
{
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### Frontend (Vercel)

1. Create new Vercel project from GitHub repo
2. Set root directory: `/client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_SOCKET_URL=https://your-backend.railway.app
   ```
6. Deploy

**Post-deployment:**
Update `CLIENT_ORIGIN` in Railway to match your Vercel URL.

## License

MIT

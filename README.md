# Real-time Token Aggregation Dashboard

A real-time dashboard that aggregates meme-coin/token data from multiple DEX sources, caches results efficiently, and pushes live updates via WebSockets.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React Client  │◄────►│  Express Server │◄────►│     Redis       │
│   (Vite)        │ WS   │  + Socket.io    │      │    (Cache)      │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │DexScreener│  │  Jupiter  │  │GeckoTerm  │
            │   API     │  │   API     │  │(fallback) │
            └───────────┘  └───────────┘  └───────────┘
```

### Components

- **React Frontend**: Displays token data with live updates, filtering, and sorting
- **Express Backend**: REST API + WebSocket server, handles aggregation and caching
- **Redis**: Caches aggregated token data (TTL: 30 seconds by default)
- **Background Poller**: Refreshes data periodically and broadcasts changes

## Data Flow

1. **Initial Load**
   - Client requests `GET /api/tokens`
   - Server checks Redis cache
   - If cache miss, fetches from DexScreener + Jupiter APIs
   - Aggregates, normalizes, and caches the data
   - Returns paginated results

2. **Real-time Updates**
   - Background poller runs every 15 seconds
   - Fetches fresh data, compares with previous snapshot
   - Detects significant changes (price > 2%, volume spike > 1.5x)
   - Broadcasts only changed tokens via WebSocket

3. **Client Updates**
   - Client receives `token-updates` event
   - Updates specific tokens in state (no full refresh)
   - Applies flash animation to changed rows

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `token-updates` | Server → Client | Array of changed tokens with deltas |
| `tokens-refresh` | Server → Client | Full token list (rare, for reconnection) |

## Caching Strategy

- **Redis Cache**: Primary cache with configurable TTL (default 30s)
- **In-Memory Fallback**: If Redis is unavailable, uses memory cache
- **Graceful Degradation**: Server continues working without Redis

## Rate Limiting

- DexScreener: ~300 requests/minute
- Axios retry with exponential backoff (3 retries, 500ms → 2000ms)
- Polling interval staggers requests to stay under limits

## API Endpoints

### GET /api/tokens

Fetches paginated token list.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| sortBy | string | 'volume' | Sort field: volume, priceChange, marketCap |
| timeFrame | string | '24h' | Time filter: 1h, 24h, 7d |
| limit | number | 20 | Page size |
| cursor | string | null | Pagination cursor (token address) |

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "nextCursor": "tokenAddress123",
    "total": 150,
    "returned": 20
  }
}
```

### GET /api/health

Health check endpoint.

## Project Structure

```
/server
  /routes           # Express route definitions
  /controllers      # Request handlers
  /services         # Business logic (aggregation, socket)
  /clients          # External API wrappers
  /utils            # Redis client, HTTP client
  /jobs             # Background polling
  /__tests__        # Jest tests
  app.js            # Express app config
  server.js         # Entry point

/client
  /src
    /components     # React components
    /services       # API and Socket clients
    /utils          # Formatters
    App.jsx         # Main app
    main.jsx        # Entry point
  index.html
```

## Getting Started

### Prerequisites

- Node.js 18+
- Redis (optional, gracefully degrades)

### Backend Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

### Running Tests

```bash
cd server
npm test
```

## Environment Variables

See `.env.example` for all available options:

```
PORT=3001
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=30
POLL_INTERVAL_SECONDS=15
PRICE_CHANGE_THRESHOLD=0.02
VOLUME_SPIKE_THRESHOLD=1.5
```

## Deployment

### Backend (Railway / Render)

1. Create new project and connect Git repo
2. Set root directory to `/server`
3. Set environment variables
4. Deploy

For Redis, use Railway's Redis addon or external provider.

### Frontend (Vercel / Netlify)

1. Create new project and connect Git repo
2. Set root directory to `/client`
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend.railway.app`
6. Deploy

## License

MIT

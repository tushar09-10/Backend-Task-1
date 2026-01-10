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

### Server (`server/.env`)

**Required:**
- `PORT` - Server port (default: 3001)
- `CLIENT_ORIGIN` - Frontend URL for CORS (e.g., `http://localhost:5173` for dev)

**Optional:**
- `REDIS_URL` - Redis connection string (gracefully degrades to in-memory cache)
- `CACHE_TTL_SECONDS` - Cache duration (default: 15)
- `POLL_INTERVAL_SECONDS` - Data refresh interval (default: 10)
- `PRICE_CHANGE_THRESHOLD` - Alert threshold for price changes (default: 0.01)
- `VOLUME_SPIKE_THRESHOLD` - Alert threshold for volume spikes (default: 1.2)

### Client (`client/.env`)

- `VITE_API_URL` - Backend API URL (leave empty for same-origin proxy in dev)
- `VITE_SOCKET_URL` - WebSocket URL (leave empty for same-origin in dev)

### Create Your Environment Files

```bash
# Server
cd server
cp .env.example .env
# Edit .env and update CLIENT_ORIGIN to match your client URL

# Client
cd ../client
cp .env.example .env
# Edit .env and update VITE_API_URL for production deployment
```

## CORS Configuration

The server uses a dynamic CORS configuration:
- If `CLIENT_ORIGIN` is set in `.env`, only that origin is allowed
- If not set, the requesting origin is reflected (development mode)
- Credentials are enabled for cookie/auth support

### Troubleshooting CORS Issues

**Problem:** "CORS policy: The request client is not allowed"

**Solutions:**
1. Ensure `CLIENT_ORIGIN` in `server/.env` matches your client URL exactly
2. For development, use `http://localhost:5173` (Vite's default port)
3. For production, set it to your deployed frontend URL
4. Restart the server after changing `.env`

**Problem:** "Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"

**Solution:** This has been fixed - the server now uses dynamic origin instead of wildcard.

## Deployment

### Backend (Railway)

1. Create new project and connect Git repo
2. Set root directory to `/server`
3. Add Redis database (recommended for production)
4. Set environment variables:
   - `CLIENT_ORIGIN` - Your deployed frontend URL
   - `REDIS_URL` - Auto-populated by Railway if using their Redis
   - `NODE_ENV=production`
5. Deploy

### Frontend (Vercel / Netlify)

1. Create new project and connect Git repo
2. Set root directory to `/client`
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend.railway.app`
6. Deploy

## License

MIT

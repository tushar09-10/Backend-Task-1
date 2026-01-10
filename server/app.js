const express = require('express');
const cors = require('cors');
const tokenRoutes = require('./routes/tokenRoutes');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // If CLIENT_ORIGIN is set, use it; otherwise allow the requesting origin
    const allowedOrigin = process.env.CLIENT_ORIGIN || origin || '*';
    callback(null, allowedOrigin);
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

app.use('/api', tokenRoutes);

app.get('/', (req, res) => {
  res.send('Token Aggregator API is running. Access endpoints at /api/tokens');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('[app] unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

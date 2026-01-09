const express = require('express');
const cors = require('cors');
const tokenRoutes = require('./routes/tokenRoutes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

app.use('/api', tokenRoutes);

app.use((err, req, res, next) => {
  console.error('[app] unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

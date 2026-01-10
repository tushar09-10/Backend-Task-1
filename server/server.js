require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const redis = require('./utils/redisClient');
const socketService = require('./services/socketService');
const poller = require('./jobs/tokenPoller');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigin = process.env.CLIENT_ORIGIN || origin || '*';
      callback(null, allowedOrigin);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

socketService.setIO(io);

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });

  socket.on('subscribe', (channel) => {
    console.log(`[socket] ${socket.id} subscribed to ${channel}`);
    socket.join(channel);
  });
});

async function start() {
  await redis.tryConnect();

  server.listen(PORT, () => {
    console.log(`[server] running on port ${PORT}`);
    console.log(`[server] environment: ${process.env.NODE_ENV || 'development'}`);
  });

  poller.start();
}

process.on('SIGTERM', () => {
  console.log('[server] shutting down...');
  poller.stop();
  server.close(() => {
    console.log('[server] closed');
    process.exit(0);
  });
});

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});

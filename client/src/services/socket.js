import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;
let connectionListeners = [];

export function connect() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[socket] connected');
    connectionListeners.forEach(fn => fn(true));
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected');
    connectionListeners.forEach(fn => fn(false));
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connection error:', err.message);
  });

  return socket;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onTokenUpdates(callback) {
  const sock = connect();
  sock.on('token-updates', callback);
  return () => sock.off('token-updates', callback);
}

export function onTokensRefresh(callback) {
  const sock = connect();
  sock.on('tokens-refresh', callback);
  return () => sock.off('tokens-refresh', callback);
}

export function onConnectionChange(callback) {
  connectionListeners.push(callback);
  if (socket) callback(socket.connected);
  return () => {
    connectionListeners = connectionListeners.filter(fn => fn !== callback);
  };
}

export function isConnected() {
  return socket?.connected || false;
}

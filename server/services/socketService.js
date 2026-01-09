let io = null;

function setIO(socketIO) {
  io = socketIO;
}

function getIO() {
  return io;
}

function broadcastTokenUpdates(changes) {
  if (!io) return;

  if (changes.length === 0) return;

  console.log(`[socket] broadcasting ${changes.length} updates`);
  io.emit('token-updates', changes);
}

function broadcastFullRefresh(tokens) {
  if (!io) return;

  console.log(`[socket] broadcasting full refresh (${tokens.length} tokens)`);
  io.emit('tokens-refresh', tokens);
}

function getConnectedClients() {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

module.exports = {
  setIO,
  getIO,
  broadcastTokenUpdates,
  broadcastFullRefresh,
  getConnectedClients
};

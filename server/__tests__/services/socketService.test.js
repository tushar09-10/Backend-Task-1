const {
  setIO,
  getIO,
  broadcastTokenUpdates,
  getConnectedClients
} = require('../../services/socketService');

describe('socketService', () => {
  let mockIO;

  beforeEach(() => {
    mockIO = {
      emit: jest.fn(),
      sockets: {
        sockets: new Map([['client1', {}], ['client2', {}]])
      }
    };
    setIO(mockIO);
  });

  afterEach(() => {
    setIO(null);
  });

  test('getIO returns the set IO instance', () => {
    expect(getIO()).toBe(mockIO);
  });

  test('broadcastTokenUpdates emits to all clients', () => {
    const changes = [{ type: 'price', token: { symbol: 'TEST' } }];
    broadcastTokenUpdates(changes);

    expect(mockIO.emit).toHaveBeenCalledWith('token-updates', changes);
  });

  test('broadcastTokenUpdates does nothing for empty changes', () => {
    broadcastTokenUpdates([]);
    expect(mockIO.emit).not.toHaveBeenCalled();
  });

  test('broadcastTokenUpdates handles null IO gracefully', () => {
    setIO(null);
    expect(() => broadcastTokenUpdates([{ type: 'test' }])).not.toThrow();
  });

  test('getConnectedClients returns correct count', () => {
    expect(getConnectedClients()).toBe(2);
  });

  test('getConnectedClients returns 0 when IO is null', () => {
    setIO(null);
    expect(getConnectedClients()).toBe(0);
  });
});

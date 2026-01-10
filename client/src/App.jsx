import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Filters from './components/Filters';
import TokenTable from './components/TokenTable';
import { fetchTokens } from './services/api';
import { connect, onTokenUpdates, onConnectionChange, disconnect } from './services/socket';

export default function App() {
  const [tokens, setTokens] = useState([]);
  const [sortBy, setSortBy] = useState('volume');
  const [timeFrame, setTimeFrame] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [flashKey, setFlashKey] = useState(null);

  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const loadTokens = useCallback(async (cursor = null, append = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await fetchTokens({ sortBy, timeFrame, limit: 20, cursor });

      if (append) {
        setTokens(prev => [...prev, ...result.data]);
      } else {
        setTokens(result.data);
      }

      setNextCursor(result.pagination.nextCursor);
    } catch (err) {
      console.error('[app] failed to load tokens:', err);
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, timeFrame]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    connect();

    const unsubConnection = onConnectionChange(setIsConnected);

    const unsubUpdates = onTokenUpdates((changes) => {
      console.log('[app] received updates:', changes.length);

      setTokens(prevTokens => {
        const tokenMap = new Map(prevTokens.map(t => [t.tokenAddress, t]));

        for (const token of changes) {
          if (tokenMap.has(token.tokenAddress)) {
            tokenMap.set(token.tokenAddress, { ...tokenMap.get(token.tokenAddress), ...token });
            setFlashKey(token.tokenAddress);
            setTimeout(() => setFlashKey(null), 600);
          }
        }

        return Array.from(tokenMap.values());
      });
    });

    // Subscribe to full refresh events
    const unsubRefresh = onTokenUpdates(() => {});
    const sock = connect();
    sock.on('tokens-refresh', (freshTokens) => {
      console.log('[app] received full refresh:', freshTokens.length);
      // Only update tokens that are in our current view
      setTokens(prevTokens => {
        const freshMap = new Map(freshTokens.map(t => [t.tokenAddress, t]));
        return prevTokens.map(t => freshMap.get(t.tokenAddress) || t);
      });
    });

    return () => {
      unsubConnection();
      unsubUpdates();
      sock.off('tokens-refresh');
      disconnect();
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    if (nextCursor && !isLoading) {
      loadTokens(nextCursor, true);
    }
  }, [nextCursor, isLoading, loadTokens]);

  const handleSortChange = useCallback((newSort) => {
    setSortBy(newSort);
    setNextCursor(null);
  }, []);

  const handleTimeFrameChange = useCallback((newTimeFrame) => {
    setTimeFrame(newTimeFrame);
    setNextCursor(null);
  }, []);

  return (
    <>
      <Header isConnected={isConnected} />
      <main className="container">
        <Filters
          sortBy={sortBy}
          timeFrame={timeFrame}
          onSortChange={handleSortChange}
          onTimeFrameChange={handleTimeFrameChange}
        />

        {error ? (
          <div className="error">{error}</div>
        ) : (
          <TokenTable
            tokens={tokens}
            timeFrame={timeFrame}
            onLoadMore={handleLoadMore}
            hasMore={!!nextCursor}
            isLoading={isLoading}
            flashKey={flashKey}
          />
        )}
      </main>
    </>
  );
}

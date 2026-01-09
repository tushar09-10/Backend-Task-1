import { formatPrice, formatVolume, formatPercent, formatMarketCap } from '../utils/formatters';

function TokenRow({ token, timeFrame, flashKey }) {
  const priceChange = timeFrame === '1h' ? token.priceChange1h
    : timeFrame === '7d' ? token.priceChange7d
    : token.priceChange24h;

  const isFlashing = flashKey === token.tokenAddress;

  return (
    <div className={`table-row ${isFlashing ? 'flash-update' : ''}`}>
      <div className="token-info">
        <div className="token-logo">
          {token.logoUri ? (
            <img src={token.logoUri} alt={token.symbol} />
          ) : (
            token.symbol?.slice(0, 2)
          )}
        </div>
        <div>
          <div className="token-name">{token.name}</div>
          <div className="token-symbol">{token.symbol}</div>
        </div>
      </div>

      <div className="cell">
        <span className="cell-label">Price</span>
        <span className="cell-value">{formatPrice(token.priceUsd)}</span>
      </div>

      <div className="cell">
        <span className="cell-label">Change</span>
        <span className={`cell-value ${priceChange >= 0 ? 'positive' : 'negative'}`}>
          {formatPercent(priceChange)}
        </span>
      </div>

      <div className="cell">
        <span className="cell-label">Volume</span>
        <span className="cell-value">{formatVolume(token.volume24h)}</span>
      </div>

      <div className="cell">
        <span className="cell-label">Liquidity</span>
        <span className="cell-value">{formatVolume(token.liquidity)}</span>
      </div>

      <div className="cell">
        <span className="cell-label">Market Cap</span>
        <span className="cell-value">{formatMarketCap(token.marketCap)}</span>
      </div>
    </div>
  );
}

export default function TokenTable({ tokens, timeFrame, onLoadMore, hasMore, isLoading, flashKey }) {
  if (isLoading && tokens.length === 0) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading tokens...</p>
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="empty">
        <p>No tokens found</p>
      </div>
    );
  }

  return (
    <div className="token-table">
      <div className="table-header">
        <div>Token</div>
        <div>Price</div>
        <div>Change</div>
        <div>Volume (24h)</div>
        <div>Liquidity</div>
        <div>Market Cap</div>
      </div>

      {tokens.map((token) => (
        <TokenRow 
          key={token.tokenAddress} 
          token={token} 
          timeFrame={timeFrame}
          flashKey={flashKey}
        />
      ))}

      {hasMore && (
        <button 
          className="load-more" 
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}

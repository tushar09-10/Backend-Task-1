export default function Filters({ sortBy, timeFrame, onSortChange, onTimeFrameChange }) {
  return (
    <div className="filters">
      <div className="filter-group">
        <label className="filter-label" htmlFor="timeFrame">Timeframe</label>
        <select
          id="timeFrame"
          className="filter-select"
          value={timeFrame}
          onChange={(e) => onTimeFrameChange(e.target.value)}
        >
          <option value="1h">1 Hour</option>
          <option value="24h">24 Hours</option>
          <option value="7d">7 Days</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="sortBy">Sort by</label>
        <select
          id="sortBy"
          className="filter-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="volume">Volume</option>
          <option value="priceChange">Price Change</option>
          <option value="marketCap">Market Cap</option>
        </select>
      </div>
    </div>
  );
}

export function formatPrice(price) {
  if (!price || price === 0) return '$0.00';

  if (price < 0.00001) {
    return `$${price.toExponential(2)}`;
  }

  if (price < 1) {
    return `$${price.toFixed(6)}`;
  }

  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatVolume(volume) {
  if (!volume || volume === 0) return '$0';

  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(2)}B`;
  }

  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(2)}M`;
  }

  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }

  return `$${volume.toFixed(0)}`;
}

export function formatPercent(value) {
  if (value == null) return '0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatMarketCap(mc) {
  return formatVolume(mc);
}

/**
 * Format a price as a string with currency
 */
export function formatPrice(price: number, currency?: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format a number of square meters to a string with units
 */
export function formatArea(area: number): string {
  return `${area.toLocaleString()} m²`;
}

/**
 * @name formatCurrency
 * @description Get the currency symbol based on the currency code
 * @returns The currency symbol
 */
export function formatCurrency(params: { currencyCode: string }): string {
  // Format a zero value to get the formatting with the symbol
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currencyCode,
    currencyDisplay: 'symbol',
  }).format(0);

  // Extract the symbol by removing digits, decimal separators, and whitespace
  return formatted.replace(/[\d\s,.]/g, '');
}

/**
 * Format a number with a suffix (e.g. 1000 -> 1K)
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

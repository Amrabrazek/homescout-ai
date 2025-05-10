/**
 * Format a price as a string with currency
 */
export function formatPrice(price: number, currency?: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
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

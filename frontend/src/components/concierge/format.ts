import type { PropertyType } from '@/lib/concierge/types';

export function formatEgp(price: number): string {
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M EGP`;
  }
  return `${new Intl.NumberFormat('en-US').format(price)} EGP`;
}

export function propertyTypeLabel(type: PropertyType): string {
  const label = type.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

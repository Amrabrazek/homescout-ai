import type { BuyerEventType } from '@/lib/graphql/buyer/types';

export function recordEvent(unitId: string, type: BuyerEventType) {
  return fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ unitId, type }),
    keepalive: true,
  });
}

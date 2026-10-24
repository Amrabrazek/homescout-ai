import { BUYER_ID_HEADER } from '@/lib/buyer/cookie';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export class InternalApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** Calls the NestJS /internal endpoints as one buyer. */
export function internalApi(buyerId: string) {
  return async function call<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${API_URL}/internal${path}`, {
      method,
      headers: {
        [BUYER_ID_HEADER]: buyerId,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const message = Array.isArray(detail?.message)
        ? detail.message.join('; ')
        : detail?.message ?? response.statusText;
      throw new InternalApiError(response.status, message);
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  };
}

export type InternalApi = ReturnType<typeof internalApi>;

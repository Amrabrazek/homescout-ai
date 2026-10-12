import { NextRequest, NextResponse } from 'next/server';
import {
  BUYER_COOKIE,
  BUYER_COOKIE_MAX_AGE,
  LAST_SEEN_COOKIE,
  PREVIOUS_VISIT_COOKIE,
  VISIT_GAP_MS,
} from '@/lib/buyer/cookie';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: BUYER_COOKIE_MAX_AGE,
} as const;

/**
 * Gives every new browser an anonymous buyer ID and tracks visits for "New
 * since your last visit". New values are also added to this request's cookies
 * so the page being rendered already sees them.
 */
export function middleware(request: NextRequest) {
  const set: Record<string, string> = {};

  if (!request.cookies.has(BUYER_COOKIE)) {
    set[BUYER_COOKIE] = crypto.randomUUID();
  }

  if (isPageRequest(request)) {
    const now = Date.now();
    const lastSeen = Number(request.cookies.get(LAST_SEEN_COOKIE)?.value);
    if (lastSeen && now - lastSeen > VISIT_GAP_MS) {
      set[PREVIOUS_VISIT_COOKIE] = new Date(lastSeen).toISOString();
    }
    set[LAST_SEEN_COOKIE] = String(now);
  }

  if (Object.keys(set).length === 0) return NextResponse.next();
  for (const [name, value] of Object.entries(set)) {
    request.cookies.set(name, value);
  }
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  for (const [name, value] of Object.entries(set)) {
    response.cookies.set(name, value, cookieOptions);
  }
  return response;
}

function isPageRequest(request: NextRequest) {
  return (
    request.method === 'GET' &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !!request.headers.get('accept')?.includes('text/html')
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon).*)'],
};

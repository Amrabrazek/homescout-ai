import { NextRequest, NextResponse } from 'next/server';
import { BUYER_COOKIE, BUYER_COOKIE_MAX_AGE } from '@/lib/buyer/cookie';

/**
 * Gives every new browser an anonymous buyer ID. It is also added to this
 * request's cookies so the page being rendered already sees it.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(BUYER_COOKIE)) return NextResponse.next();

  const buyerId = crypto.randomUUID();
  request.cookies.set(BUYER_COOKIE, buyerId);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.cookies.set(BUYER_COOKIE, buyerId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: BUYER_COOKIE_MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon).*)'],
};

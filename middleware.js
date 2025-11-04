/*
  Next.js Middleware

  IMPORTANT: This file must be placed in the root directory of your project (not in app/ or pages/)
  to function correctly. This is because Next.js specifically looks for middleware.js at the root level
  during the request pipeline.

  This middleware runs before your pages and API routes. It can be used for:
  - Authentication
  - Redirects
  - Rewriting URLs
  - Adding headers
  - Logging
  - Any other logic that should run before requests

  To run middleware only on specific paths, use the config matcher:
  export const config = {
    matcher: '/api/:path*'  // Example: only runs on API routes
  }
*/

import { NextResponse } from 'next/server'
import { getToken } from "@auth/core/jwt";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const pathname = req.nextUrl.pathname;

  // Allow access to auth routes
  if (pathname.startsWith('/auth') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register'))
  {
    return NextResponse.next();
  }

  // Redirect to login if NO token and trying to access a protected route
if (!token && pathname !== '/') {
  return NextResponse.redirect(new URL('/login', req.url));
}
  // If the user IS logged in and trying to access an auth page, redirect to dashboard
  if (token && (pathname.startsWith('/login') || pathname === '/register' || pathname.startsWith('/auth'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Important: Create a response to modify
  const response = NextResponse.next();

  // Ensure we forward any existing cookies
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    // This makes the cookie headers available to server components
    response.headers.set('cookie', cookieHeader);
  }

  return response;
}

export const config = {
  /* This regular expression is a negative lookahead.
  It matches any route that does not start with api, auth, or _next.
  This is a very useful pattern for protecting most of the
  application while excluding specific routes. */
  matcher: ['/((?!api|auth|_next|favicon|_vercel|images).*)'],
};
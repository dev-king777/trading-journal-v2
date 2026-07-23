import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, static assets, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Inspect cookies for Supabase or local auth session tokens
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (c) =>
      c.name.includes('sb-') ||
      c.name.includes('supabase') ||
      c.name.includes('auth-token') ||
      c.name.includes('draga-auth')
  );

  // If no auth cookie is present, redirect to /login
  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

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

  // Inspect cookies for Supabase auth tokens
  const cookies = request.cookies.getAll();
  const hasSupabaseAuthCookie = cookies.some(
    (c) =>
      c.name.includes('sb-') ||
      c.name.includes('supabase') ||
      c.name.includes('auth-token')
  );

  const isSupabaseConfiguredInEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // If Supabase is active in environment and user has no auth cookie, redirect to /login
  if (isSupabaseConfiguredInEnv && !hasSupabaseAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

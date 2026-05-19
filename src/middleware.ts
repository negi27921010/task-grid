import { NextResponse, type NextRequest } from 'next/server';

// Why this is just a cookie-presence check (not a real auth call):
//
// The previous version awaited supabase.auth.getUser() on every request.
// Under intermittent Edge → Supabase latency that exceeded Vercel's
// middleware time budget, every page started 504-ing with
// MIDDLEWARE_INVOCATION_TIMEOUT. Auth validation still happens — server
// components and API routes go through @/lib/supabase-server, which both
// validates the session and refreshes the token on each render. So this
// middleware's only job is the cheap gate: "no auth cookie at all → push
// to /login". Stale cookies fall through here and get rejected by the
// page-level Supabase client, which is the correct boundary anyway.
export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login';
  const hasAuthCookie = request.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (!hasAuthCookie && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

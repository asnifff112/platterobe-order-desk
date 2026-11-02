import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * Copy cookies from source response to redirect response so refreshed session
 * tokens or cleared cookies are preserved during HTTP redirects.
 */
function redirectWithCookies(
  url: URL,
  sourceResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  let user: User | null = null;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  // Validate URL format before attempting to create client
  const isValidUrl =
    Boolean(rawUrl) &&
    (rawUrl!.startsWith('http://') || rawUrl!.startsWith('https://'));

  if (isValidUrl && rawKey) {
    try {
      const supabase = createServerClient(rawUrl!, rawKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      // Refresh the session token if expired — IMPORTANT: do not remove
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    } catch (err) {
      console.error('[Proxy/Middleware] Supabase auth check error:', err);
      user = null;
    }
  } else {
    // If Supabase environment variables are missing on Vercel, log a clear warning
    console.warn(
      '[Proxy/Middleware] Supabase environment variables missing or invalid URL. Protected routes will require login. Supabase URL:',
      rawUrl ? 'present' : 'missing',
      '| Supabase Key:',
      rawKey ? 'present' : 'missing'
    );
  }

  const pathname = request.nextUrl.pathname;

  // Route classifications
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/reset-password');

  const isPublicApi = pathname.startsWith('/api/whatsapp/webhook');

  const isApiRoute = pathname.startsWith('/api/');

  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/expenses') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings');

  // 1. Unauthenticated access to protected API routes -> 401 Unauthorized JSON
  if (!user && isApiRoute && !isPublicApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Unauthenticated access to protected dashboard pages -> redirect to /login
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return redirectWithCookies(url, supabaseResponse);
  }

  // 3. Authenticated user accessing auth routes (e.g. /login) -> redirect to /dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return redirectWithCookies(url, supabaseResponse);
  }

  // 4. Root path handling: redirect to dashboard if authenticated, login if not
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/dashboard' : '/login';
    return redirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

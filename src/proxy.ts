import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/lib/public-env";

const LOGIN_PATH = "/login";

/**
 * Refreshes the Supabase session on every request so Server Components and
 * Server Actions see a valid token, and does an optimistic redirect for
 * anonymous visitors. Real authorization lives in requireMember().
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  // Supabase's no-cache headers: responses that set auth cookies must never be
  // cached by a CDN, or one user's session could be served to another.
  const authHeaders = new Headers();

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            authHeaders.set(key, value);
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Nothing may run between createServerClient and getClaims: the refresh
  // must complete before the response is built (Supabase SSR guidance).
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = typeof data?.claims.sub === "string";
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  // A redirect must carry the refreshed cookies and the no-cache headers, but
  // none of the internal x-middleware-* headers that NextResponse.next() sets.
  const redirectTo = (pathname: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    authHeaders.forEach((value, key) => redirect.headers.set(key, value));
    return redirect;
  };

  if (!isAuthenticated && !isLoginPage) return redirectTo(LOGIN_PATH);
  if (isAuthenticated && isLoginPage) return redirectTo("/");
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimization and the PWA's
    // public files: the browser fetches the manifest, the service worker,
    // the icons and the offline page without the session, and a redirect
    // to /login would break installing the app (decision 072).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public API routes that don't need auth
  const publicApiRoutes = [
    '/api/nfts', // Public NFT listing
    '/api/orders', // Public order listing
    '/api/qr', // QR code generation
  ];
  
  const isPublicApiRoute = publicApiRoutes.some(route => 
    pathname.startsWith(route) && request.method === 'GET'
  );
  
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Create response that we'll modify with cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update both request and response cookies
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Remove from both request and response cookies
          const removeOptions = { ...options, maxAge: 0 };
          request.cookies.set({ name, value: "", ...removeOptions });
          response.cookies.set({ name, value: "", ...removeOptions });
        },
      },
    }
  );

  // Get session and trigger refresh if needed
  // This will write updated cookies to the response if session is refreshed
  let session = null;
  let user = null;
  
  try {
    console.log(`\x1b[36m[Middleware] Processing ${pathname} - Getting session...\x1b[0m`);
    
    const {
      data: { session: authSession },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(`\x1b[31m[Middleware] Session error on ${pathname}:\x1b[0m`, sessionError);
    } else {
      session = authSession;
      user = authSession?.user || null;
      console.log(`\x1b[32m[Middleware] Session status on ${pathname}: ${user ? 'authenticated' : 'anonymous'}\x1b[0m`);
    }
  } catch (error) {
    console.error(`\x1b[31m[Middleware] Auth error on ${pathname}:\x1b[0m`, error);
  }

  // Define protected routes
  const protectedRoutes = [
    "/profile",
    "/wallet", 
    "/orders",
    "/admin",
    "/create",
    "/chat",
    "/api/chat",
    "/api/bids", 
    "/api/payments",
    "/api/upload",
    "/api/nfts/purchase",
  ];
  
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !user) {
    console.log(`\x1b[33m[Middleware] Redirecting to login from ${pathname}\x1b[0m`);
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login page
  if (user && pathname === "/auth/login") {
    const redirectedFrom = request.nextUrl.searchParams.get("redirectedFrom");
    const redirectTo = redirectedFrom || "/";
    console.log(`\x1b[35m[Middleware] Redirecting authenticated user from login to ${redirectTo}\x1b[0m`);
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Add session info to response headers for debugging (optional)
  if (user) {
    response.headers.set('x-user-id', user.id);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     * This ensures middleware runs on all pages and API routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

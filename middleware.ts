import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

let DEBUG_MODE = false;

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
  
  // Skip auth check for auth callback route - it handles its own auth
  const isAuthCallback = pathname === '/api/auth/callback' || pathname === '/auth/callback';
  
  if (isPublicApiRoute || isAuthCallback) {
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
          let x = request.cookies.get(name)?.value;
          DEBUG_MODE ? console.log(`\x1b[34m[Middleware] Get cookie: ${name}=${x}\x1b[0m`) : null;
          return x;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update both request and response cookies
          console.log(`\x1b[34m[Middleware] Set cookie: ${name}=${value}\x1b[0m`);
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Remove from both request and response cookies
          console.log(`\x1b[34m[Middleware] Remove cookie: ${name}\x1b[0m`);
          const removeOptions = { ...options, maxAge: 0 };
          request.cookies.set({ name, value: "", ...removeOptions });
          response.cookies.set({ name, value: "", ...removeOptions });
        },
      },
    }
  );

  // Get user and trigger refresh if needed
  // This will write updated cookies to the response if session is refreshed
  // Using getUser() instead of getSession() as recommended by Supabase docs
  // getUser() validates the JWT on the server, while getSession() doesn't
  let user = null;
  
  // Define protected routes early so we can use them in error handling
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
  
  try {
    console.log(`\x1b[36m[Middleware] Processing ${pathname} - Getting user...\x1b[0m`);
    
    const {
      data: { user: authUser },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      // Only log auth errors for protected routes, not public pages
      const isProtectedPath = protectedRoutes.some((route) => pathname.startsWith(route));
      
      if (isProtectedPath || userError.name !== 'AuthSessionMissingError') {
        console.error(`\x1b[31m[Middleware] User error on ${pathname}:\x1b[0m`, userError);
      }
    } else {
      user = authUser;
      console.log(`\x1b[32m[Middleware] Auth status on ${pathname}: ${user ? 'authenticated' : 'anonymous'}\x1b[0m`);
      DEBUG_MODE ? console.log('\x1b[32m[Middleware] User info:\x1b[0m', user) : null;
    }
  } catch (error) {
    console.error(`\x1b[31m[Middleware] Auth error on ${pathname}:\x1b[0m`, error);
  }
  
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

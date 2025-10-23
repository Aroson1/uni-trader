import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update the request cookies
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Create a new response with updated cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          // Set cookies on the response
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Update the request cookies
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          // Create a new response with updated cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          // Remove cookies from the response
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // IMPORTANT: Use getSession() instead of getUser()
  // getSession() will automatically refresh the session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  // Protected routes that require authentication
  const protectedRoutes = [
    "/profile",
    "/wallet",
    "/orders",
    "/admin",
    "/create",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if trying to access protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname === "/auth/login") {
    const redirectedFrom = request.nextUrl.searchParams.get("redirectedFrom");
    const redirectTo = redirectedFrom || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

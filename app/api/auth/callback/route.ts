import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('[Auth Callback] OAuth error:', error);
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_error`);
  }

  if (!code) {
    console.error('[Auth Callback] No authorization code provided');
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
  }

  // Create response to modify cookies
  const response = NextResponse.redirect(`${origin}${next}`);

  // Create Supabase client with cookie adapter that can write
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", maxAge: 0, ...options });
        },
      },
    }
  );

  try {
    console.log('[Auth Callback] Exchanging code for session...');
    
    // Exchange the OAuth code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('[Auth Callback] Code exchange error:', exchangeError);
      return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`);
    }

    if (!data.session) {
      console.error('[Auth Callback] No session returned from code exchange');
      return NextResponse.redirect(`${origin}/auth/login?error=no_session`);
    }

    console.log('[Auth Callback] Successfully exchanged code for session:', {
      userId: data.user?.id,
      email: data.user?.email,
    });

    // Ensure user profile exists
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email,
          avatar_url: data.user.user_metadata?.avatar_url,
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
        console.error('[Auth Callback] Profile upsert error:', profileError);
        // Don't fail the auth process for profile errors
      }
    }

    return response;

  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);
    return NextResponse.redirect(`${origin}/auth/login?error=server_error`);
  }
}
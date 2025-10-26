import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Read-only server-side Supabase client
// Prevents cookie writes in Server Components, forces them to middleware/route handlers
export const createServerSupabaseClient = (options?: { throwOnCookieWrite?: boolean }) => {
  const cookieStore = cookies();
  const shouldThrow = options?.throwOnCookieWrite ?? true;

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          if (shouldThrow) {
            // Throw clear error instead of silently failing
            throw new Error(
              `Cookie write attempted in Server Component (${name}). ` +
              `Cookie writes must happen in middleware or route handlers only. ` +
              `This prevents silent failures and ensures proper session management.`
            );
          } else {
            // Fallback for route handlers - attempt the write but catch errors
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.warn(`Failed to set cookie ${name} in route handler:`, error);
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          if (shouldThrow) {
            // Throw clear error instead of silently failing
            throw new Error(
              `Cookie removal attempted in Server Component (${name}). ` +
              `Cookie writes must happen in middleware or route handlers only. ` +
              `This prevents silent failures and ensures proper session management.`
            );
          } else {
            // Fallback for route handlers - attempt the removal but catch errors
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              console.warn(`Failed to remove cookie ${name} in route handler:`, error);
            }
          }
        },
      },
    }
  );
};

// Route Handler compatible client (allows cookie writes with fallback)
export const createRouteHandlerSupabaseClient = () => {
  return createServerSupabaseClient({ throwOnCookieWrite: false });
};

// Helper function to get the current user on the server
export const getServerUser = async () => {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting server user:', error);
    return null;
  }
  
  return user;
};
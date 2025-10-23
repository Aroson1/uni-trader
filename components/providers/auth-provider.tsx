"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get initial session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Auth initialization error:", error.message);
          setUser(null);
          useAuthStore.setState({ profile: null });
          return;
        }

        const session = data.session;

        if (!mounted) return;

        if (session?.user) {
          console.log("✅ Session found:", session.user.email);
          setUser(session.user);
          await fetchProfile();
        } else {
          console.log("ℹ️ No active session");
          setUser(null);
          useAuthStore.setState({ profile: null });
        }
      } catch (error) {
        console.error("❌ Auth init error:", error);
        setUser(null);
        useAuthStore.setState({ profile: null });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("🔄 Auth state change:", event);

      switch (event) {
        case "SIGNED_IN":
          console.log("✅ User signed in:", session?.user?.email);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile();
          }
          break;

        case "SIGNED_OUT":
          console.log("👋 User signed out");
          setUser(null);
          useAuthStore.setState({ profile: null });
          break;

        case "TOKEN_REFRESHED":
          console.log("🔄 Token refreshed");
          setUser(session?.user ?? null);
          // Profile should still be valid, no need to refetch
          break;

        case "USER_UPDATED":
          console.log("👤 User updated");
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile();
          }
          break;

        default:
          // Handle other events
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile();
          } else {
            useAuthStore.setState({ profile: null });
          }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchProfile]);

  return <>{children}</>;
}

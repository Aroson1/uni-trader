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
        // Get initial user - use getUser() for proper JWT validation on server
        // getUser() validates the token with the Auth server, unlike getSession()
        // which only reads from local storage without validation
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("❌ Auth initialization error:", error.message);
          if (mounted) {
            setUser(null);
            useAuthStore.setState({ profile: null });
          }
          return;
        }

        const user = data.user;

        if (!mounted) return;

        if (user) {
          console.log("✅ User authenticated:", user.email);
          setUser(user);
          await fetchProfile();
        } else {
          console.log("ℹ️ No active session");
          setUser(null);
          useAuthStore.setState({ profile: null });
        }
      } catch (error) {
        console.error("❌ Auth init error:", error);
        if (mounted) {
          setUser(null);
          useAuthStore.setState({ profile: null });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set initial loading state
    setLoading(true);
    initAuth();

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("🔄 Auth state change:", event, session?.user?.email);

      switch (event) {
        case "SIGNED_IN":
          console.log("✅ User signed in:", session?.user?.email);
          setUser(session?.user ?? null);
          if (session?.user) {
            console.log("📥 Fetching profile after sign in...");
            await fetchProfile();
            console.log("✅ Profile fetch complete");
          }
          setLoading(false);
          break;

        case "SIGNED_OUT":
          console.log("👋 User signed out");
          setUser(null);
          useAuthStore.setState({ profile: null });
          setLoading(false);
          break;

        case "TOKEN_REFRESHED":
          console.log("🔄 Token refreshed for:", session?.user?.email);
          setUser(session?.user ?? null);
          // Profile should still be valid, no need to refetch
          break;

        case "USER_UPDATED":
          console.log("👤 User updated:", session?.user?.email);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile();
          }
          break;

        case "INITIAL_SESSION":
          // Handle initial session load
          console.log("📍 Initial session detected:", session?.user?.email);
          setUser(session?.user ?? null);
          if (session?.user) {
            console.log("📥 Fetching profile for initial session...");
            await fetchProfile();
            console.log("✅ Initial profile fetch complete");
          }
          setLoading(false);
          break;

        default:
          // Handle other events
          console.log("🔔 Other auth event:", event);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile();
          } else {
            useAuthStore.setState({ profile: null });
          }
      }
    });

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = async (e: StorageEvent) => {
      if (!mounted) return;
      
      // Check if Supabase auth token changed in another tab
      if (e.key?.startsWith('sb-') && e.key?.includes('auth-token')) {
        console.log("🔄 Auth state changed in another tab, syncing...");
        
        // Re-fetch user to sync state
        try {
          const { data: { user: syncedUser }, error } = await supabase.auth.getUser();
          
          if (error) {
            console.error("❌ Error syncing auth state:", error);
            setUser(null);
            useAuthStore.setState({ profile: null });
          } else if (syncedUser) {
            console.log("✅ Synced user from another tab:", syncedUser.email);
            setUser(syncedUser);
            await fetchProfile();
          } else {
            console.log("ℹ️ No user in synced state");
            setUser(null);
            useAuthStore.setState({ profile: null });
          }
        } catch (error) {
          console.error("❌ Failed to sync auth state:", error);
        }
      }
    };

    // Add storage event listener for cross-tab sync
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setUser, setLoading, fetchProfile]);

  return <>{children}</>;
}

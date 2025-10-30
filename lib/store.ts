import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface Profile {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  wallet_address: string | null;
  wallet_balance: number;
  is_verified: boolean;
  social_links: Record<string, any>;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    try {
      // Clear local state immediately
      set({ user: null, profile: null, loading: false });

      // Sign out from Supabase using the 'global' scope
      // This clears auth cookies and localStorage managed by Supabase
      // No need to manually clear localStorage - Supabase handles it
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error("Supabase signOut error:", error);
      }

      // Force redirect to home page to clear any cached state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, clear local state and redirect
      set({ user: null, profile: null, loading: false });

      window.location.href = "/";
    }
  },
  fetchProfile: async () => {
    const { user } = get();
    if (!user) {
      console.log("❌ No user to fetch profile for");
      set({ profile: null });
      return;
    }

    try {
      console.log("📥 Fetching profile for user:", user.id, user.email);
      
      // Check if we have a valid session first
      console.log("🔍 Checking for active session...");
      
      const sessionCheckPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Session check timeout")), 5000)
      );
      
      
      let sessionData, sessionError;
      try {
        const result: any = await Promise.race([sessionCheckPromise, sessionTimeout]);
        sessionData = result.data;
        sessionError = result.error;
        console.log("✅ Session check complete:", { hasSession: !!sessionData?.session, error: sessionError });
      } catch (timeoutError) {
        console.error("❌ Session check timed out:", timeoutError);
        sessionError = timeoutError;
      }
      
      if (sessionError || !sessionData?.session) {
        console.warn("⚠️ No active session, using metadata fallback. Error:", sessionError?.message || "No session");
        // Use fallback for now, will be retried on next auth state change
        const fallbackProfile = {
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email || null,
          bio: null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          banner_url: null,
          wallet_address: null,
          wallet_balance: 0,
          is_verified: false,
          social_links: {},
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log("✅ Set fallback profile:", fallbackProfile.name);
        set({ profile: fallbackProfile });
        return;
      }
      
      console.log("✅ Session confirmed, proceeding with database query");
      
      // Add timeout to prevent hanging
      console.log("🔍 Querying profiles table...");
      const fetchWithTimeout = async () => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
        );
        
        const fetchPromise = supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        return Promise.race([fetchPromise, timeoutPromise]);
      };

      // First, try to get existing profile with timeout
      let result;
      try {
        result = await fetchWithTimeout();
        console.log("✅ Query complete");
      } catch (timeoutError) {
        console.error("❌ Profile query timed out:", timeoutError);
        throw timeoutError;
      }
      
      const { data: existingProfile, error: fetchError } = result as any;

      if (fetchError) {
        console.error("❌ Error fetching profile:", fetchError.message, fetchError);
        // Don't throw, continue to create profile
      }

      if (existingProfile) {
        console.log("✅ Profile found and setting in store:", existingProfile.name);
        set({ profile: existingProfile });
        console.log("✅ Profile set complete, current state:", get().profile?.name);
        return;
      }

      // If no profile exists, create one using Google OAuth data
      console.log("⚠️ No profile found, creating new profile...");
      const profileData = {
        id: user.id,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User",
        email: user.email || user.user_metadata?.email,
        avatar_url:
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        bio: null,
        banner_url: null,
        wallet_address: null,
        is_verified: false,
        social_links: {},
        preferences: {},
      };

      console.log("📤 Inserting new profile:", profileData);

      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert([profileData])
        .select()
        .single();

      console.log("📬 Insert result:", { newProfile, createError });

      if (newProfile && !createError) {
        console.log("✅ Profile created successfully:", newProfile.name);
        set({ profile: newProfile });
        console.log("✅ New profile set in store:", get().profile?.name);
      } else {
        console.error("❌ Error creating profile:", createError?.message, createError);
        // Fallback profile if database creation fails
        const fallbackProfile = {
          id: user.id,
          name: profileData.name,
          email: profileData.email,
          bio: null,
          avatar_url: profileData.avatar_url,
          banner_url: null,
          wallet_address: null,
          wallet_balance: 0,
          is_verified: false,
          social_links: {},
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log("⚠️ Using fallback profile:", fallbackProfile.name);
        set({ profile: fallbackProfile });
      }
    } catch (error) {
      console.error("❌ Unexpected error in fetchProfile:", error);
      // Set fallback profile on any error
      const fallbackProfile = {
        id: user.id,
        name: user.email?.split("@")[0] || "User",
        email: user.email || null,
        bio: null,
        avatar_url: user.user_metadata?.avatar_url || null,
        banner_url: null,
        wallet_address: null,
        wallet_balance: 0,
        is_verified: false,
        social_links: {},
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log("⚠️ Using fallback profile after error:", fallbackProfile.name);
      set({ profile: fallbackProfile });
    }
  },
}));

interface ThemeState {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  setTheme: (theme) => set({ theme }),
}));

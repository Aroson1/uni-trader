import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface Profile {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  wallet_address: string | null;
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
      
      // Sign out from Supabase (this clears auth cookies and localStorage)
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      
      // Clear any additional browser storage that might persist
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might persist auth state
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.session');
        // Clear any other app-specific storage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      // Force redirect to home page to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local state and redirect
      set({ user: null, profile: null, loading: false });
      
      // Clear storage on error too
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      window.location.href = '/';
    }
  },
  fetchProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ profile: null });
      return;
    }

    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      set({ profile: existingProfile });
      return;
    }

    // If no profile exists, create one using Google OAuth data
    if (!existingProfile && !fetchError) {
      const profileData = {
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email || user.user_metadata?.email,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        bio: null,
        banner_url: null,
        wallet_address: null,
        is_verified: false,
        social_links: {},
        preferences: {},
      };

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (newProfile && !createError) {
        set({ profile: newProfile });
      } else {
        // Fallback profile if database creation fails
        set({ 
          profile: {
            id: user.id,
            name: profileData.name,
            email: profileData.email,
            bio: null,
            avatar_url: profileData.avatar_url,
            banner_url: null,
            wallet_address: null,
            is_verified: false,
            social_links: {},
            preferences: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        });
      }
    }
  },
}));

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
}));

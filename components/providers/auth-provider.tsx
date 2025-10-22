'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
        }
        
        const session = data.session;
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile();
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear all auth state on sign out
        setUser(null);
        useAuthStore.setState({ profile: null });
        return;
      }
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile();
      } else {
        useAuthStore.setState({ profile: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchProfile]);

  return <>{children}</>;
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const redirectedFrom = searchParams.get('redirectedFrom');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First, try to handle the auth callback from URL fragments
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // If we already have a session, use it
        if (sessionData.session && !sessionError) {
          console.log('Found existing session');
          const redirectTo = redirectedFrom || '/';
          router.replace(redirectTo);
          return;
        }

        // Handle OAuth callback - this processes URL fragments like #access_token=...
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth callback error:', authError);
          router.replace('/auth/login?error=callback_failed');
          return;
        }

        if (authData.user) {
          console.log('User authenticated via callback');
          // User is authenticated, redirect to original destination or home
          const redirectTo = redirectedFrom || '/';
          router.replace(redirectTo);
        } else {
          console.warn('No user found after callback');
          // No user found, redirect to login
          router.replace('/auth/login?error=no_user');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth/login?error=callback_failed');
      } finally {
        setIsProcessing(false);
      }
    };

    // Set a timeout to prevent indefinite hanging
    const timeoutId = setTimeout(() => {
      console.warn('Auth callback timeout, redirecting to login');
      router.replace('/auth/login?error=timeout');
    }, 10000); // 10 seconds timeout

    handleAuthCallback().finally(() => {
      clearTimeout(timeoutId);
    });

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [router, redirectedFrom]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {isProcessing ? 'Completing sign in...' : 'Redirecting...'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          If this takes too long, please{' '}
          <button 
            onClick={() => router.replace('/auth/login')}
            className="underline hover:text-primary"
          >
            try again
          </button>
        </p>
      </div>
    </div>
  );
}
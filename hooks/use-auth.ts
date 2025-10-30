"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

interface UseAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  redirectFrom?: string;
}

/**
 * Custom hook for handling authentication state
 * This ensures consistent auth behavior across all components
 */
export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, redirectTo = "/auth/login", redirectFrom } = options;
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;

    if (requireAuth && !user) {
      const url = new URL(redirectTo, window.location.origin);
      if (redirectFrom) {
        url.searchParams.set("redirectedFrom", redirectFrom);
      }
      router.push(url.toString());
    }
  }, [user, loading, requireAuth, redirectTo, redirectFrom, router]);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isReady: !loading, // Whether auth state has been determined
  };
}

/**
 * Hook specifically for protected pages that require authentication
 */
export function useRequireAuth(redirectFrom?: string) {
  return useAuth({
    requireAuth: true,
    redirectFrom: redirectFrom || (typeof window !== 'undefined' ? window.location.pathname : undefined),
  });
}

/**
 * Hook for checking auth state without requiring authentication
 */
export function useOptionalAuth() {
  return useAuth({ requireAuth: false });
}
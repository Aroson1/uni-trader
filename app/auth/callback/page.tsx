"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const redirectedFrom = searchParams.get("redirectedFrom");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
          console.error("OAuth error:", errorParam, errorDescription);
          setError(errorDescription || "Authentication failed");
          setTimeout(
            () => router.replace("/auth/login?error=oauth_error"),
            2000
          );
          return;
        }

        // Get the session - Supabase will automatically handle the code exchange
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Failed to establish session");
          setTimeout(
            () => router.replace("/auth/login?error=session_error"),
            2000
          );
          return;
        }

        if (session) {
          console.log("✅ Authentication successful:", session.user.email);

          // Wait a moment for the AuthProvider to sync
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Redirect to destination
          const redirectTo = redirectedFrom || "/";
          router.replace(redirectTo);
        } else {
          // No session found, wait for auth state change
          console.log("⏳ Waiting for session...");

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              console.log("✅ Session established:", session.user.email);
              subscription.unsubscribe();

              // Wait a moment for sync
              setTimeout(() => {
                const redirectTo = redirectedFrom || "/";
                router.replace(redirectTo);
              }, 500);
            }
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            setError("Authentication timeout");
            router.replace("/auth/login?error=timeout");
          }, 10000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        setError("An unexpected error occurred");
        setTimeout(
          () => router.replace("/auth/login?error=callback_failed"),
          2000
        );
      }
    };

    handleCallback();
  }, [router, redirectedFrom, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-lg font-medium mb-2">Authentication Error</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-xs text-muted-foreground">
              Redirecting to login...
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium mb-2">Completing sign in...</p>
            <p className="text-xs text-muted-foreground mt-2">
              If this takes too long, please{" "}
              <button
                onClick={() => router.replace("/auth/login")}
                className="underline hover:text-primary"
              >
                try again
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

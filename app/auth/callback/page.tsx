"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const redirectedFrom = searchParams.get("redirectedFrom");
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const handleAuthCallback = async () => {
      try {
        // Check for OAuth authorization code in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        console.log("Auth callback: URL params:", {
          code: !!code,
          error,
          redirectedFrom,
        });

        // Handle OAuth error
        if (error) {
          console.error("OAuth error:", error);
          router.replace("/auth/login?error=oauth_error");
          return;
        }

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log("Auth callback: Auth state change:", event, !!session);

            if (event === "SIGNED_IN" && session) {
              console.log("Auth callback: User signed in:", session.user.email);

              // Clean up URL by removing OAuth parameters
              const cleanUrl = new URL(
                window.location.origin + window.location.pathname
              );
              if (redirectedFrom) {
                cleanUrl.searchParams.set("redirectedFrom", redirectedFrom);
              }
              window.history.replaceState({}, "", cleanUrl.toString());

              // Redirect to original destination or home
              const redirectTo = redirectedFrom || "/";
              console.log("Auth callback: Redirecting to:", redirectTo);
              router.replace(redirectTo);
            } else if (event === "SIGNED_OUT") {
              console.log("Auth callback: User signed out");
              router.replace("/auth/login?error=sign_out");
            }
          }
        );

        // If we have an authorization code, let Supabase handle it automatically
        if (code) {
          console.log(
            "Auth callback: OAuth code found, letting Supabase handle it..."
          );

          // Supabase should automatically process the code via the auth state change listener
          // We don't need to manually call exchangeCodeForSession

          // Set a timeout to prevent infinite waiting
          setTimeout(() => {
            if (isProcessing) {
              console.warn(
                "Auth callback: Timeout waiting for auth state change"
              );
              router.replace("/auth/login?error=timeout");
            }
          }, 15000); // 15 second timeout
        } else {
          // No code, check for existing session
          console.log(
            "Auth callback: No code found, checking existing session..."
          );
          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            console.error("Auth callback: Session error:", sessionError);
            router.replace("/auth/login?error=session_error");
            return;
          }

          if (sessionData.session && sessionData.session.user) {
            console.log("Auth callback: Existing session found");
            const redirectTo = redirectedFrom || "/";
            router.replace(redirectTo);
          } else {
            console.warn("Auth callback: No session found");
            router.replace("/auth/login?error=no_session");
          }
        }

        // Cleanup listener on unmount
        return () => {
          authListener?.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth callback: Unexpected error:", error);
        router.replace("/auth/login?error=callback_failed");
      } finally {
        setIsProcessing(false);
      }
    };

    // Process the callback immediately
    handleAuthCallback();
  }, [router, redirectedFrom]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {isProcessing ? "Completing sign in..." : "Redirecting..."}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          If this takes too long, please{" "}
          <button
            onClick={() => router.replace("/auth/login")}
            className="underline hover:text-primary"
          >
            try again
          </button>
        </p>
      </div>
    </div>
  );
}

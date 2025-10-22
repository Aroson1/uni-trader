'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export default function DebugAuthPage() {
  const { user, profile, loading } = useAuthStore();
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Debug: Session check', { session, error });
        setSessionData({ session, error });
      } catch (err) {
        console.error('Debug: Session check error', err);
        setSessionData({ error: err });
      } finally {
        setSessionLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Auth Store State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Loading: {loading ? 'true' : 'false'}</div>
            <div>User ID: {user?.id || 'null'}</div>
            <div>User Email: {user?.email || 'null'}</div>
            <div>Profile Name: {profile?.name || 'null'}</div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Direct Session Check</h2>
          {sessionLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2 font-mono text-sm">
              <div>Session User ID: {sessionData?.session?.user?.id || 'null'}</div>
              <div>Session Email: {sessionData?.session?.user?.email || 'null'}</div>
              <div>Session Error: {sessionData?.error?.message || 'none'}</div>
              <div>Access Token: {sessionData?.session?.access_token ? 'Present' : 'Missing'}</div>
            </div>
          )}
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</div>
            <div>Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Document Cookies:</div>
            <div className="pl-4 text-xs">{document.cookie || 'No cookies'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
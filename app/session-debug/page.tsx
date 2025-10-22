'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SessionDebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Session Debug: Checking session...');
        
        // Check localStorage for session data
        const localStorageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        
        console.log('Session Debug: LocalStorage keys:', localStorageKeys);
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        console.log('Session Debug: Session data:', data);
        console.log('Session Debug: Session error:', error);
        
        setSessionInfo({
          session: data.session,
          error: error,
          localStorageKeys: localStorageKeys,
          url: window.location.href,
          cookies: document.cookie
        });
        
      } catch (err) {
        console.error('Session Debug: Error:', err);
        setSessionInfo({ error: err });
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const testLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('Login error:', error);
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const testLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return <div className="p-8">Loading session debug...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Session Debug</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Session Status</h2>
          <p>Has Session: {sessionInfo?.session ? 'Yes' : 'No'}</p>
          {sessionInfo?.session && (
            <div>
              <p>User ID: {sessionInfo.session.user?.id}</p>
              <p>Email: {sessionInfo.session.user?.email}</p>
              <p>Expires: {new Date(sessionInfo.session.expires_at * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Storage</h2>
          <p>LocalStorage Keys: {sessionInfo?.localStorageKeys?.length || 0}</p>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(sessionInfo?.localStorageKeys, null, 2)}
          </pre>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <button 
              onClick={testLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Login
            </button>
            <button 
              onClick={testLogout}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Test Logout
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>

        <details className="p-4 border rounded">
          <summary className="font-semibold cursor-pointer">Full Debug Data</summary>
          <pre className="text-xs mt-2 overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
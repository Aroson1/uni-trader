'use client';

import { useAuthStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export function DebugAuth() {
  const { user, profile, loading } = useAuthStore();
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    // Check browser storage
    const checkStorage = () => {
      if (typeof window !== 'undefined') {
        const storageData = {
          localStorage: {} as any,
          sessionStorage: {} as any,
        };
        
        // Get all localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            storageData.localStorage[key] = localStorage.getItem(key);
          }
        });
        
        // Get all sessionStorage items
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            storageData.sessionStorage[key] = sessionStorage.getItem(key);
          }
        });
        
        setSessionInfo(storageData);
      }
    };
    
    checkStorage();
    // Update every 2 seconds
    const interval = setInterval(checkStorage, 2000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="space-y-1">
        <div>User: {user ? '✅ Logged in' : '❌ Not logged in'}</div>
        <div>Profile: {profile ? '✅ Loaded' : '❌ No profile'}</div>
        <div>Loading: {loading ? '⏳ Loading' : '✅ Ready'}</div>
        <div>Email: {user?.email || 'None'}</div>
        {sessionInfo && (
          <details className="mt-2">
            <summary className="cursor-pointer">Storage Info</summary>
            <pre className="mt-1 text-xs overflow-auto max-h-32">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
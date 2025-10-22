'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    
    getUser();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectedFrom=/test-create`,
      }
    });
    
    if (error) {
      console.error('Login error:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      {user ? (
        <div>
          <p className="mb-4">✅ User is authenticated!</p>
          <p className="mb-4">User ID: {user.id}</p>
          <p className="mb-4">Email: {user.email}</p>
          <Button onClick={() => window.location.href = '/create'}>
            Go to Create Page
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-4">❌ User is not authenticated</p>
          <Button onClick={handleLogin}>
            Login with Google
          </Button>
        </div>
      )}
    </div>
  );
}
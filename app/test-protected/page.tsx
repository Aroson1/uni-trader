'use client';

import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function TestProtectedPage() {
  const { user, profile } = useAuthStore();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Protected Route Test</h1>
      
      {user ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Success! You can access this protected route.
          <p className="mt-2">User: {profile?.name || user.email}</p>
        </div>
      ) : (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ Error: You should not see this if authentication is working.
        </div>
      )}

      <div className="space-y-2">
        <div><Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link></div>
        <div><Link href="/wallet" className="text-blue-600 hover:underline">Test /wallet route</Link></div>
        <div><Link href="/profile/test" className="text-blue-600 hover:underline">Test /profile route</Link></div>
        <div><Link href="/orders" className="text-blue-600 hover:underline">Test /orders route</Link></div>
      </div>
    </div>
  );
}
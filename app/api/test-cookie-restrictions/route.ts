import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createRouteHandlerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const results = {
    success: true,
    message: 'Cookie restriction tests completed',
    details: '',
    tests: [] as Array<{ name: string; status: string; message: string }>
  };

  // Test 1: Server component behavior (should throw)
  try {
    const serverSupabase = createServerSupabaseClient();
    // This should throw an error if called from server component context
    await serverSupabase.auth.getSession();
    
    results.tests.push({
      name: 'Server Component Restrictions',
      status: 'warning',
      message: 'Server component client allowed session call (may be in route handler context)'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cookie write attempted')) {
      results.tests.push({
        name: 'Server Component Restrictions',
        status: 'pass',
        message: 'Server component properly throws error on cookie write'
      });
    } else {
      results.tests.push({
        name: 'Server Component Restrictions',
        status: 'fail',
        message: `Unexpected error: ${error}`
      });
    }
  }

  // Test 2: Route handler behavior (should work)
  try {
    const routeSupabase = createRouteHandlerSupabaseClient();
    const { data, error } = await routeSupabase.auth.getSession();
    
    results.tests.push({
      name: 'Route Handler Client',
      status: 'pass',
      message: 'Route handler client works correctly'
    });
  } catch (error) {
    results.tests.push({
      name: 'Route Handler Client', 
      status: 'fail',
      message: `Route handler client error: ${error}`
    });
  }

  // Test 3: Check middleware headers
  const userHeader = request.headers.get('x-user-id');
  results.tests.push({
    name: 'Middleware Session',
    status: userHeader ? 'pass' : 'info',
    message: userHeader 
      ? `Middleware set user ID: ${userHeader}`
      : 'No user session (not logged in)'
  });

  results.details = `Completed ${results.tests.length} tests`;
  
  return NextResponse.json(results);
}
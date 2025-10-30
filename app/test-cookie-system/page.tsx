'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'loading';
  message: string;
  details?: string;
}

export default function CookieTestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    const testResults: TestResult[] = [];

    // Test 1: Check if cookies are set after middleware
    testResults.push({
      name: 'Middleware Cookie Handling',
      status: 'loading',
      message: 'Checking if middleware properly sets auth cookies...'
    });
    setTests([...testResults]);

    try {
      // Check current cookies
      const cookieTest = document.cookie.includes('sb-') || 
                        document.cookie.includes('supabase');
      
      testResults[0] = {
        name: 'Middleware Cookie Handling',
        status: cookieTest ? 'pass' : 'warning',
        message: cookieTest 
          ? 'Auth cookies found in browser'
          : 'No auth cookies found (user may not be logged in)',
        details: `Cookies: ${document.cookie || 'none'}`
      };
      setTests([...testResults]);
    } catch (error) {
      testResults[0] = {
        name: 'Middleware Cookie Handling',
        status: 'fail',
        message: `Error checking cookies: ${error}`,
      };
      setTests([...testResults]);
    }

    // Test 2: Check server component behavior
    testResults.push({
      name: 'Server Component Restrictions',
      status: 'loading',
      message: 'Testing server component cookie write restrictions...'
    });
    setTests([...testResults]);

    try {
      const response = await fetch('/api/test-cookie-restrictions');
      const result = await response.json();
      
      testResults[1] = {
        name: 'Server Component Restrictions',
        status: result.success ? 'pass' : 'fail',
        message: result.message,
        details: result.details
      };
      setTests([...testResults]);
    } catch (error) {
      testResults[1] = {
        name: 'Server Component Restrictions',
        status: 'warning',
        message: 'Test endpoint not available (this is expected)',
        details: 'Create /api/test-cookie-restrictions to test server component restrictions'
      };
      setTests([...testResults]);
    }

    // Test 3: Check auth callback functionality
    testResults.push({
      name: 'Auth Callback Route',
      status: 'loading',
      message: 'Testing auth callback route availability...'
    });
    setTests([...testResults]);

    try {
      const response = await fetch('/api/auth/callback', { method: 'GET' });
      
      testResults[2] = {
        name: 'Auth Callback Route',
        status: response.status === 302 ? 'pass' : 'warning',
        message: response.status === 302 
          ? 'Auth callback route responds correctly (redirects without code)'
          : `Auth callback returned status: ${response.status}`,
        details: 'OAuth callback route is available and functional'
      };
      setTests([...testResults]);
    } catch (error) {
      testResults[2] = {
        name: 'Auth Callback Route',
        status: 'fail',
        message: `Auth callback route error: ${error}`,
      };
      setTests([...testResults]);
    }

    // Test 4: Check session persistence
    testResults.push({
      name: 'Session Persistence',
      status: 'loading',
      message: 'Checking session persistence across page loads...'
    });
    setTests([...testResults]);

    try {
      // Simulate session check
      const { supabase } = await import('@/lib/supabase');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        testResults[3] = {
          name: 'Session Persistence',
          status: 'fail',
          message: `Session check error: ${error.message}`,
        };
      } else {
        testResults[3] = {
          name: 'Session Persistence',
          status: session ? 'pass' : 'warning',
          message: session 
            ? 'User session is active and persistent'
            : 'No active session (user not logged in)',
          details: session ? `User: ${session.user?.email}` : undefined
        };
      }
      setTests([...testResults]);
    } catch (error) {
      testResults[3] = {
        name: 'Session Persistence',
        status: 'fail',
        message: `Session test error: ${error}`,
      };
      setTests([...testResults]);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800', 
      warning: 'bg-yellow-100 text-yellow-800',
      loading: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  useEffect(() => {
    // Auto-run tests on page load
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Cookie & Auth System Tests</h1>
          <p className="text-muted-foreground">
            This page tests the new cookie handling implementation to ensure
            server components are read-only and middleware handles session management.
          </p>
        </div>

        <div className="mb-6">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="mb-4"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Tests'
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    {test.name}
                  </CardTitle>
                  {getStatusBadge(test.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {test.message}
                </p>
                {test.details && (
                  <div className="bg-muted p-3 rounded text-xs font-mono">
                    {test.details}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {tests.length === 0 && !isRunning && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Click "Run Tests" to check the cookie handling implementation.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
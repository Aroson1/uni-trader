# Cookie & Auth System Testing Guide

## Overview
This document provides comprehensive testing instructions for the new cookie handling system that prevents silent cookie write failures and centralizes session management.

## Key Changes Made

### 1. Read-Only Server Components
- Server components now throw clear errors instead of silently failing cookie writes
- All cookie writes must happen in middleware or route handlers
- Prevents session restoration issues caused by failed cookie updates

### 2. Centralized Cookie Management
- Middleware handles all cookie writes during session refresh
- Route handlers can write cookies when needed (OAuth callbacks)
- Clear separation between read-only and write contexts

### 3. Enhanced Error Handling
- No more silent cookie write failures
- Clear error messages when cookie writes are attempted in wrong context
- Improved debugging through explicit error handling

## Manual Testing Steps

### Step 1: Test Server Component Restrictions

1. **Navigate to test page:**
   ```
   http://localhost:3000/test-cookie-system
   ```

2. **Expected behavior:**
   - Tests should show server components properly restrict cookie writes
   - Route handlers should work normally
   - Clear pass/fail status for each test

### Step 2: Test OAuth Flow

1. **Test the auth callback route:**
   ```bash
   curl -i http://localhost:3000/api/auth/callback
   ```
   - Should redirect (302) since no code provided
   - Route should be available and functional

2. **Test OAuth login flow:**
   - Go to `/auth/login`
   - Click social login (Google, GitHub, etc.)
   - Should redirect to `/api/auth/callback` with code
   - Should set cookies and redirect to app

### Step 3: Test Session Persistence

1. **Login to the application**
2. **Open browser dev tools > Application > Cookies**
3. **Verify Supabase cookies are set:**
   - Look for `sb-*` cookies
   - Should have proper domain, path, and security settings

4. **Test session restoration:**
   - Refresh the page
   - Session should persist
   - User should remain logged in

5. **Test middleware protection:**
   - Visit protected routes while logged out: `/create`, `/wallet`, `/profile`
   - Should redirect to login with `redirectedFrom` parameter
   - After login, should redirect back to original page

### Step 4: Test Server Component Safety

1. **Check server component pages:**
   - Visit `/profile/[user]` (server component)
   - Should load without cookie write errors
   - Check browser console and server logs

2. **Verify error handling:**
   - Server components should not cause silent failures
   - Any cookie write attempts should throw clear errors

## Automated Testing

### Unit Tests (Jest/Vitest)

```typescript
// Example test for cookie restrictions
describe('Supabase Server Client', () => {
  it('should throw error when trying to write cookies in server component', async () => {
    const client = createServerSupabaseClient();
    
    expect(async () => {
      // This should trigger a cookie write and throw
      await client.auth.signInWithPassword({ email: 'test@test.com', password: 'test' });
    }).toThrow('Cookie write attempted in Server Component');
  });

  it('should allow cookie writes in route handler context', async () => {
    const client = createRouteHandlerSupabaseClient();
    
    // This should not throw
    await expect(client.auth.getSession()).resolves.not.toThrow();
  });
});
```

### Integration Tests (Playwright/Cypress)

```typescript
// Example E2E test
test('auth flow with proper cookie handling', async ({ page }) => {
  // Test login flow
  await page.goto('/auth/login');
  await page.click('[data-testid="google-login"]');
  
  // Should redirect through OAuth and back to app
  await page.waitForURL('/');
  
  // Check cookies are set
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name.startsWith('sb-'));
  expect(authCookie).toBeDefined();
  
  // Test session persistence
  await page.reload();
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  
  // Test protected route access
  await page.goto('/create');
  await expect(page).toHaveURL('/create'); // Should not redirect
});
```

## Monitoring & Debugging

### Server Logs
Monitor for these log patterns:

```bash
# Good: Middleware processing
[Middleware] Processing /create - Getting session...
[Middleware] Session status on /create: authenticated

# Good: Auth callback success
[Auth Callback] Successfully exchanged code for session: { userId: "...", email: "..." }

# Bad: Cookie write errors (should be rare after fix)
Cookie write attempted in Server Component (sb-access-token)
```

### Browser Console
Check for these patterns:

```javascript
// Good: No cookie-related errors
// Bad: Auth errors or session restoration failures
Session Debug: Session error: {...}
```

### Performance Monitoring
- Monitor middleware execution time
- Check for excessive auth checks
- Verify session refresh frequency

## Common Issues & Solutions

### Issue: "Cookie write attempted in Server Component"
**Solution:** Move the operation to middleware or route handler

### Issue: Session not persisting across pages
**Solution:** Check middleware configuration and cookie settings

### Issue: OAuth callback fails
**Solution:** Verify callback URL configuration and route handler implementation

### Issue: Protected routes not working
**Solution:** Check middleware matcher configuration and route protection logic

## Configuration Verification

### Environment Variables
Ensure these are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Middleware Configuration
```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Supabase Auth Settings
- Confirm OAuth redirect URLs include `/api/auth/callback`
- Verify site URL configuration
- Check RLS policies for profiles table

## Success Criteria

✅ **Server components are read-only**
- No cookie write attempts in server components
- Clear errors when violations occur

✅ **Session management is centralized**
- Middleware handles session refresh
- Cookies are properly set and updated

✅ **OAuth flow works correctly**
- Callback route sets cookies properly
- Users are redirected appropriately

✅ **No silent failures**
- All cookie operations succeed or throw clear errors
- Session restoration works reliably

✅ **Protected routes function properly**
- Unauthenticated users are redirected
- Authenticated users can access protected content

## Rollback Plan

If issues occur, revert to previous implementation:

1. Restore original `lib/supabase-server.ts`
2. Remove error throwing from cookie adapters
3. Remove `/api/auth/callback` route
4. Test critical auth flows

The new implementation is backward compatible and can be safely reverted if needed.
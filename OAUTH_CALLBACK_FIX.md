# OAuth Callback Fix - Test Instructions

## What I Fixed

The main issue was that the callback page wasn't properly exchanging the OAuth authorization code for a session. I added:

1. **`exchangeCodeForSession(code)`** - Properly converts OAuth code to session
2. **URL parameter detection** - Checks for `code` parameter in callback URL
3. **Better error handling** - More specific error messages
4. **Clean URL after success** - Removes OAuth parameters from URL

## Test Steps

### Step 1: Clear Browser State
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
```

### Step 2: Test the Fixed OAuth Flow
1. **Go to**: `http://localhost:3000/auth/login`
2. **Click**: "Continue with Google" 
3. **Complete Google OAuth**
4. **Watch the console logs** during callback processing

### Expected Behavior

✅ **Successful Flow:**
```
Auth callback: OAuth code found, exchanging for session...
Auth callback: Session established: {session: {...}}
Auth callback: User authenticated: 6289654a-a519-44d4-abcc-ea5af31875ba
Successfully signed in!
```

✅ **After Success:**
- Should redirect to home page (`/`)
- URL should be clean (no `?code=...` parameters)
- Should see your name in header instead of "User"
- Protected routes should work

### Step 3: Test Session Persistence
1. **After successful login, try**: `http://localhost:3000/test-protected`
2. **Should show**: ✅ Success message
3. **Check middleware logs**: Should show "User found: true"

### Step 4: Test Protected Routes
Try accessing:
- `/wallet`
- `/profile/test` 
- `/orders`
- `/create`

Should **NOT** get redirected to login page.

## If Still Stuck at Callback

If you're still stuck at the callback URL, check:

1. **Browser console errors**
2. **Network tab** for failed requests
3. **Supabase project settings**:
   - Site URL includes `http://localhost:3000`
   - Redirect URLs includes `http://localhost:3000/auth/callback`

## Debug Commands

Run in browser console while stuck at callback:
```javascript
// Check URL parameters
console.log('URL params:', new URLSearchParams(window.location.search));

// Test manual session check
import { supabase } from './lib/supabase';
supabase.auth.getSession().then(console.log);
```

The key fix is the `exchangeCodeForSession()` method which should resolve the stuck callback issue!
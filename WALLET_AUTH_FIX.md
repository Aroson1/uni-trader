# Auth Loading State Fixes

## Issue 1: Wallet Page Redirecting to Login

The `/wallet` page was redirecting to the login page on every refresh, even when the user was authenticated.

## Issue 2: Header Showing "User" Instead of Username

When refreshing any page, the header briefly displayed "User" instead of the actual username.

## Root Cause

Race condition between:

1. **AuthProvider** - Loads user session asynchronously from Supabase on app mount
2. **Components** - Accessed user/profile data immediately before auth finished loading

### Issue 1 Details

The wallet page's useEffect executed before the AuthProvider finished loading the session, saw `user: null`, and redirected immediately.

### Issue 2 Details

The header component tried to display `profile?.name` before the profile was loaded, showing the fallback "User" text.

## Solutions

### Fix 1: Wallet Page

Updated the wallet page to check the `loading` state from the auth store before deciding to redirect:

```typescript
// Before (❌ Race condition)
useEffect(() => {
  if (!user) {
    router.push("/auth/login");
    return;
  }
  loadWalletData();
}, [user, router]);

// After (✅ Waits for auth to load)
useEffect(() => {
  // Wait for auth to finish loading before checking user
  if (authLoading) return;

  if (!user) {
    router.push("/auth/login");
    return;
  }

  loadWalletData();
}, [user, authLoading, router]);
```

Also updated the loading screen to show while auth is initializing:

```typescript
if (authLoading || loading) {
  return <LoadingScreen />;
}
```

### Fix 2: Header Component

Updated the header to show a loading skeleton instead of fallback text while auth is loading:

```typescript
// Before (❌ Shows "User" while loading)
<span className="hidden sm:block text-sm font-medium">
  {profile?.name || "User"}
</span>

// After (✅ Shows loading skeleton)
<span className="hidden sm:block text-sm font-medium">
  {authLoading ? (
    <span className="inline-block w-16 h-4 bg-muted animate-pulse rounded"></span>
  ) : (
    profile?.name || "User"
  )}
</span>
```

Also updated the avatar fallback to show "..." while loading:

```typescript
<AvatarFallback>
  {authLoading ? "..." : profile?.name?.charAt(0) || "U"}
</AvatarFallback>
```

## Files Modified

- `app/wallet/page.tsx` - Added auth loading check
- `components/layout/header.tsx` - Added loading skeleton for username display

## Testing

### Test 1: Wallet Page

1. ✅ Login to the application
2. ✅ Navigate to `/wallet` page
3. ✅ Refresh the page (Ctrl+R or F5)
4. ✅ Should stay on wallet page, not redirect to login

### Test 2: Header Username

1. ✅ Login to the application
2. ✅ Navigate to any page
3. ✅ Refresh the page (Ctrl+R or F5)
4. ✅ Header should show a loading skeleton briefly, then display your actual username
5. ✅ Should NOT flash "User" text before showing your name

## Other Protected Pages

Other protected pages (`/create`, `/chat`, etc.) use a different pattern where they fetch the session directly via `supabase.auth.getUser()` in their own useEffect. This works fine because:

- The middleware catches unauthenticated users first
- They fetch the session directly without depending on the auth store's async initialization

The wallet page now uses the same defensive approach by checking the loading state.

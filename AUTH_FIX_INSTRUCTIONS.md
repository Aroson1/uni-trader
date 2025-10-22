# Authentication Fix Instructions

## Current Issue
Google OAuth login works, but users see "User" instead of their name and can't access protected routes because the profile is not being created/loaded properly.

## Immediate Steps to Test

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test authentication:**
   - Go to http://localhost:3000/auth/login
   - Click "Continue with Google"
   - After login, go to http://localhost:3000/debug-auth to see what's happening

3. **Check browser console for logs:**
   - Open browser DevTools (F12)
   - Look for console logs starting with "AuthProvider:" and "Fetching profile"
   - This will show if the profile is being found or created

## Database Migration Required

Apply this migration to your Supabase database (via Supabase Dashboard SQL Editor):

```sql
-- Fix handle_new_user function to properly handle Google OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    email, 
    avatar_url,
    bio,
    banner_url,
    wallet_address,
    is_verified,
    social_links,
    preferences
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    null,
    null,
    null,
    false,
    '{}',
    '{}'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      profiles.name
    ),
    email = NEW.email,
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', profiles.avatar_url),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## What I've Fixed

1. **Enhanced profile creation:** The client-side code now creates profiles with Google OAuth data if they don't exist
2. **Better error handling:** More detailed console logging to debug issues
3. **Fallback profile:** Even if database profile creation fails, the app creates a temporary profile object
4. **Updated Profile interface:** Added missing fields like `is_verified`, `social_links`, `preferences`

## Testing Steps

1. **For existing users:** Delete your profile from the Supabase profiles table and try logging in again
2. **For new users:** The profile should be created automatically
3. **Check debug page:** Visit `/debug-auth` to see detailed auth status

## If Issues Persist

Check these in order:

1. **Environment variables:** Ensure `.env.local` has correct Supabase URL and anon key
2. **Google OAuth setup:** Verify redirect URL in Google Console: `https://your-project.supabase.co/auth/v1/callback`
3. **Supabase auth settings:** Check that Google provider is enabled in Supabase Dashboard
4. **RLS policies:** Ensure profiles table has proper Row Level Security policies

The enhanced logging will help identify exactly where the issue is occurring.
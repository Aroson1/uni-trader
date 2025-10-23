-- Add user banning functionality
-- This migration adds a banned field to profiles and updates the moderation logic

-- Add banned field to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'banned'
    ) THEN
        ALTER TABLE profiles ADD COLUMN banned BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added banned column to profiles table';
    END IF;
END $$;

-- Add banned_at timestamp for tracking when user was banned
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'banned_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
        RAISE NOTICE 'Added banned_at column to profiles table';
    END IF;
END $$;

-- Add ban_reason for tracking why user was banned
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'ban_reason'
    ) THEN
        ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
        RAISE NOTICE 'Added ban_reason column to profiles table';
    END IF;
END $$;

-- Create index for banned users queries
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned) WHERE banned = TRUE;

-- Function to ban a user after 3 warnings
CREATE OR REPLACE FUNCTION ban_user_after_warnings(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    warning_count INTEGER;
    user_name TEXT;
BEGIN
    -- Get warning count for the user
    SELECT COUNT(id)
    INTO warning_count
    FROM moderation_warnings
    WHERE user_id = p_user_id
      AND moderation_action = 'WARN'
      AND created_at >= NOW() - INTERVAL '30 days'; -- Warnings reset after 30 days

    -- If user has 3+ warnings, ban them
    IF warning_count >= 3 THEN
        -- Get user name for ban reason
        SELECT name INTO user_name FROM profiles WHERE id = p_user_id;
        
        -- Ban the user
        UPDATE profiles 
        SET 
            banned = TRUE,
            banned_at = NOW(),
            ban_reason = 'Automatically banned after 3 moderation warnings'
        WHERE id = p_user_id;
        
        RAISE NOTICE 'User % (%) banned after % warnings', user_name, p_user_id, warning_count;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION ban_user_after_warnings(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'User banning functionality added successfully';
END $$;

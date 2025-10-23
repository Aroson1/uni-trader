-- Fix conversations table schema to match V1 chat expectations
-- This ensures the table has all required columns

-- Step 1: Rename columns directly (no DO block needed for renames)
ALTER TABLE conversations RENAME COLUMN participant_one_id TO participant1_id;
ALTER TABLE conversations RENAME COLUMN participant_two_id TO participant2_id;

-- Step 2: Add last_message_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added last_message_at column';
  END IF;
END $$;

-- Step 3: Fix messages table - ensure 'read' column exists (boolean)
DO $$
BEGIN
  -- If read_at exists, convert it to read (boolean)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    -- Add read column
    ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
    -- Set read = true where read_at is not null
    UPDATE messages SET read = TRUE WHERE read_at IS NOT NULL;
    -- Drop read_at
    ALTER TABLE messages DROP COLUMN read_at;
    RAISE NOTICE 'Converted read_at to read column';
  END IF;
  
  -- If read doesn't exist, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added read column';
  END IF;
END $$;

-- Step 4: Drop old indexes if they exist
DROP INDEX IF EXISTS idx_conversations_participant_one;
DROP INDEX IF EXISTS idx_conversations_participant_two;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Conversations table schema fixed successfully!';
END $$;

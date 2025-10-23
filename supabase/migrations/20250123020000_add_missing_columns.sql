-- Fix conversations table to match V1 chat expectations
-- Add the missing columns that V1 chat code expects

-- Add participant columns
ALTER TABLE conversations ADD COLUMN participant1_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN participant2_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add last_message_at column
ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Ensure messages table has 'read' column (boolean)
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

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Conversations table schema fixed successfully!';
  RAISE NOTICE 'Added participant1_id, participant2_id, and last_message_at columns';
END $$;

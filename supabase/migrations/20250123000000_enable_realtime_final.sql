-- Enable Real-time for Messages Table
-- This ensures the real-time subscription works properly

-- First, make sure the messages table exists with the correct schema
-- (This should already exist from previous migrations)

-- Enable real-time publication for messages table
DO $$
BEGIN
  -- Try to add the table to the publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    RAISE NOTICE 'Added messages table to real-time publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'messages table already in real-time publication';
  END;
END $$;

-- Also enable for conversations table
DO $$
BEGIN
  -- Try to add the table to the publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    RAISE NOTICE 'Added conversations table to real-time publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'conversations table already in real-time publication';
  END;
END $$;

-- Verify the RLS policies allow real-time subscriptions
-- The policies should already exist, but we'll recreate them to be sure

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

-- Recreate policies
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their messages" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

-- Create index for better real-time performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Verify the messages table structure
DO $$
BEGIN
  -- Check if 'read' column exists (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Ensure sender_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'sender_id'
  ) THEN
    RAISE EXCEPTION 'messages table is missing sender_id column - please run the base schema migration first';
  END IF;
END $$;

-- Grant necessary permissions for real-time
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT ON conversations TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Real-time enabled successfully for messages table';
END $$;


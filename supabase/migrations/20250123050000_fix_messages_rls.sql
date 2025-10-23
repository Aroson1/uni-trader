-- Fix RLS policies for messages table to work with real-time
-- Remove duplicate policies and simplify for real-time compatibility

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create simple, real-time compatible policies
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

CREATE POLICY "messages_delete_policy" ON messages
  FOR DELETE USING (
    sender_id = auth.uid()
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed RLS policies for messages table';
  RAISE NOTICE 'Removed duplicate policies and simplified for real-time compatibility';
END $$;

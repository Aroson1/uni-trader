-- Fix RLS policies for conversations table to match actual schema
-- Drop the old policies that reference created_by column
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Conversation creators can update conversations" ON conversations;

-- Create new policies that work with participant1_id and participant2_id
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

CREATE POLICY "Participants can update conversations" ON conversations
  FOR UPDATE USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed for conversations table!';
  RAISE NOTICE 'Policies now work with participant1_id and participant2_id';
END $$;

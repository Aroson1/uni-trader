-- Fix RLS Policies to Avoid Infinite Recursion
-- This migration fixes the circular dependency in conversation_participants policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

-- Recreate conversation_participants policies without recursion
-- Allow users to view participants in conversations they're part of
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR 
    conversation_id IN (
      SELECT cp.conversation_id 
      FROM conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  );

-- Allow users to be added to conversations (by the conversation creator or themselves)
CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    conversation_id IN (
      SELECT id FROM conversations WHERE created_by = auth.uid()
    )
  );

-- Allow users to leave conversations they're in
CREATE POLICY "Users can leave conversations" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- Also update the conversations SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (
      SELECT cp.conversation_id 
      FROM conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  );

-- Update messages policies to be more efficient
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT cp.conversation_id 
      FROM conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  );

-- Update typing_indicators policy
DROP POLICY IF EXISTS "Users can view typing indicators in their conversations" ON typing_indicators;

CREATE POLICY "Users can view typing indicators in their conversations" ON typing_indicators
  FOR SELECT USING (
    conversation_id IN (
      SELECT cp.conversation_id 
      FROM conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  );


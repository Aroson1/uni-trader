-- Clean up functions and triggers that reference conversation_participants
-- These are causing the "relation does not exist" error

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_create_direct_conversation_participants ON conversations;

-- Drop the functions
DROP FUNCTION IF EXISTS get_conversation_participants(UUID);
DROP FUNCTION IF EXISTS create_direct_conversation_participants();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Cleaned up functions and triggers referencing conversation_participants';
  RAISE NOTICE 'Removed: get_conversation_participants function';
  RAISE NOTICE 'Removed: create_direct_conversation_participants function';
  RAISE NOTICE 'Removed: trigger_create_direct_conversation_participants trigger';
END $$;

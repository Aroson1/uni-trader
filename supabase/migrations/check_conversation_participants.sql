-- Check if conversation_participants table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'conversation_participants';

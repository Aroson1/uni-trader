-- Check for any functions that reference conversation_participants
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%conversation_participants%';

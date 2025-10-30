-- Check for any triggers that might reference conversation_participants
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%conversation_participants%';

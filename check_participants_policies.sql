-- Check all RLS policies that reference conversation_participants
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE qual LIKE '%conversation_participants%' 
   OR with_check LIKE '%conversation_participants%';

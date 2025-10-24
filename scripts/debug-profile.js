const { createClient } = require('@supabase/supabase-js');

// Use your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfile(userId) {
  console.log('Debugging profile for user:', userId);
  
  // Check if user exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  console.log('Profile:', profile);
  if (profileError) console.log('Profile Error:', profileError);
  
  // Check created NFTs
  const { data: createdNfts, error: createdError } = await supabase
    .from('nfts')
    .select(`
      id,
      title,
      media_url,
      price,
      status,
      sale_type,
      likes,
      views,
      created_at,
      creator_id,
      owner_id
    `)
    .eq('creator_id', userId);
  
  console.log('Created NFTs:', createdNfts);
  if (createdError) console.log('Created NFTs Error:', createdError);
  
  // Check owned NFTs
  const { data: ownedNfts, error: ownedError } = await supabase
    .from('nfts')
    .select(`
      id,
      title,
      media_url,
      price,
      status,
      sale_type,
      likes,
      views,
      created_at,
      creator_id,
      owner_id,
      creator:profiles!nfts_creator_id_fkey(id, name, avatar_url)
    `)
    .eq('owner_id', userId);
  
  console.log('Owned NFTs:', ownedNfts);
  if (ownedError) console.log('Owned NFTs Error:', ownedError);
  
  // Check all NFTs to see what exists
  const { data: allNfts, error: allError } = await supabase
    .from('nfts')
    .select('id, title, creator_id, owner_id, status')
    .limit(10);
  
  console.log('All NFTs (sample):', allNfts);
  if (allError) console.log('All NFTs Error:', allError);
}

// Get user ID from command line or use a test UUID
const userId = process.argv[2] || 'test-user-id';
debugProfile(userId).catch(console.error);
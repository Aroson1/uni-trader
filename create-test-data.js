const { createClient } = require('@supabase/supabase-js');

// Use your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('Creating test users and NFTs...');
  
  try {
    // First, let's see what users exist
    const { data: existingUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .limit(5);
    
    console.log('Existing users:', existingUsers);
    if (usersError) console.log('Users error:', usersError);
    
    if (!existingUsers || existingUsers.length === 0) {
      console.log('No users found. You need to sign up through the app first.');
      return;
    }
    
    const testUser = existingUsers[0]; // Use the first existing user
    
    // Create some test NFTs
    const testNfts = [
      {
        title: 'Test NFT 1 - Created',
        description: 'A test NFT created by the user',
        media_url: 'https://via.placeholder.com/400x400/FF5733/FFFFFF?text=NFT1',
        price: 100,
        category: 'Art',
        creator_id: testUser.id,
        owner_id: testUser.id,
        status: 'available',
        sale_type: 'fixed',
      },
      {
        title: 'Test NFT 2 - Created',
        description: 'Another test NFT created by the user',
        media_url: 'https://via.placeholder.com/400x400/33C3FF/FFFFFF?text=NFT2',
        price: 200,
        category: 'Digital Art',
        creator_id: testUser.id,
        owner_id: testUser.id,
        status: 'active',
        sale_type: 'auction',
      },
      {
        title: 'Test NFT 3 - Draft',
        description: 'A draft NFT',
        media_url: 'https://via.placeholder.com/400x400/FFC733/FFFFFF?text=NFT3',
        price: 50,
        category: 'Photography',
        creator_id: testUser.id,
        owner_id: testUser.id,
        status: 'draft',
        sale_type: 'fixed',
      }
    ];
    
    // If there's a second user, create NFTs owned by the first user but created by the second
    if (existingUsers.length > 1) {
      const creator = existingUsers[1];
      testNfts.push({
        title: 'Test NFT 4 - Owned',
        description: 'An NFT owned by user but created by someone else',
        media_url: 'https://via.placeholder.com/400x400/FF33C7/FFFFFF?text=NFT4',
        price: 300,
        category: 'Music',
        creator_id: creator.id,
        owner_id: testUser.id,
        status: 'available',
        sale_type: 'fixed',
      });
    }
    
    // Insert test NFTs
    const { data: insertedNfts, error: insertError } = await supabase
      .from('nfts')
      .insert(testNfts)
      .select();
    
    if (insertError) {
      console.error('Error inserting NFTs:', insertError);
    } else {
      console.log('Successfully created test NFTs:', insertedNfts);
    }
    
    // Check what NFTs exist now
    const { data: allNfts } = await supabase
      .from('nfts')
      .select('id, title, creator_id, owner_id, status')
      .eq('creator_id', testUser.id)
      .or(`owner_id.eq.${testUser.id}`);
    
    console.log('NFTs for test user:', allNfts);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestData();
import { supabase } from '../lib/supabase.js';

const sampleUsers = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Salvador Dali',
    email: 'salvador@unitrader.com',
    bio: 'Renowned surrealist artist exploring digital realms',
    avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    wallet_address: '0x1234567890123456789012345678901234567890',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Trista Francis',
    email: 'trista@unitrader.com',
    bio: 'Contemporary artist and digital creator',
    avatar_url: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg',
    wallet_address: '0x2345678901234567890123456789012345678901',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Freddie Carpenter',
    email: 'freddie@unitrader.com',
    bio: 'Sculptor and mixed media artist',
    avatar_url: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg',
    wallet_address: '0x3456789012345678901234567890123456789012',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Tyler Covington',
    email: 'tyler@unitrader.com',
    bio: 'Fashion designer and NFT enthusiast',
    avatar_url: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg',
    wallet_address: '0x4567890123456789012345678901234567890123',
  },
];

const sampleNFTs = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Hamlet Contemplates Contemporary Existence',
    description: 'A surreal interpretation of classic literature through digital art',
    media_url: 'https://images.pexels.com/photos/3109807/pexels-photo-3109807.jpeg',
    media_type: 'image',
    price: 4.89,
    category: 'Art',
    sale_type: 'auction',
    auction_end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'available',
    creator_id: '00000000-0000-0000-0000-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000001',
    royalty_percentage: 10,
    views_count: 223,
    properties: { 'Artist': 'Salvador Dali', 'Medium': 'Digital', 'Year': '2024' },
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: 'Triumphant Awakening Contemporary Art',
    description: 'A powerful representation of human resilience and hope',
    media_url: 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg',
    media_type: 'image',
    price: 6.25,
    category: 'Art',
    sale_type: 'auction',
    auction_end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'available',
    creator_id: '00000000-0000-0000-0000-000000000002',
    owner_id: '00000000-0000-0000-0000-000000000002',
    royalty_percentage: 8,
    views_count: 445,
    properties: { 'Artist': 'Trista Francis', 'Medium': 'Digital Photography', 'Year': '2024' },
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: 'Living Vase 01 By Lanza',
    description: 'Organic forms meet digital craftsmanship in this unique piece',
    media_url: 'https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg',
    media_type: 'image',
    price: 3.75,
    category: 'Collectibles',
    sale_type: 'auction',
    auction_end_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'available',
    creator_id: '00000000-0000-0000-0000-000000000003',
    owner_id: '00000000-0000-0000-0000-000000000003',
    royalty_percentage: 12,
    views_count: 312,
    properties: { 'Artist': 'Freddie Carpenter', 'Medium': '3D Render', 'Year': '2024' },
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    title: 'Flame Dress By Balmain',
    description: 'High fashion meets digital artistry in this stunning creation',
    media_url: 'https://images.pexels.com/photos/1102772/pexels-photo-1102772.jpeg',
    media_type: 'image',
    price: 8.50,
    category: 'Art',
    sale_type: 'fixed',
    auction_end_time: null,
    status: 'available',
    creator_id: '00000000-0000-0000-0000-000000000004',
    owner_id: '00000000-0000-0000-0000-000000000004',
    royalty_percentage: 15,
    views_count: 567,
    properties: { 'Artist': 'Tyler Covington', 'Medium': 'Digital Art', 'Year': '2024', 'Collection': 'Fashion Series' },
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    title: 'Abstract Geometry #1',
    description: 'Exploring mathematical beauty through digital visualization',
    media_url: 'https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg',
    media_type: 'image',
    price: 2.90,
    category: 'Art',
    sale_type: 'fixed',
    auction_end_time: null,
    status: 'available',
    creator_id: '00000000-0000-0000-0000-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000001',
    royalty_percentage: 10,
    views_count: 189,
    properties: { 'Artist': 'Salvador Dali', 'Medium': 'Generative Art', 'Year': '2024' },
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    title: 'Neon Dreams',
    description: 'Cyberpunk aesthetics in vibrant digital form',
    media_url: 'https://images.pexels.com/photos/1591282/pexels-photo-1591282.jpeg',
    media_type: 'image',
    price: 5.40,
    category: 'Virtual Worlds',
    sale_type: 'auction',
    auction_end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'available',
    creator_id: '00000000-0000-0000-0000-000000000002',
    owner_id: '00000000-0000-0000-0000-000000000002',
    royalty_percentage: 8,
    views_count: 756,
    properties: { 'Artist': 'Trista Francis', 'Medium': 'Digital Art', 'Year': '2024', 'Theme': 'Cyberpunk' },
  },
];

const sampleOrders = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nft_id: '00000000-0000-0000-0000-000000000001',
    buyer_id: '00000000-0000-0000-0000-000000000002',
    seller_id: '00000000-0000-0000-0000-000000000001',
    amount: 4.20,
    type: 'bid',
    status: 'pending',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nft_id: '00000000-0000-0000-0000-000000000002',
    buyer_id: '00000000-0000-0000-0000-000000000003',
    seller_id: '00000000-0000-0000-0000-000000000002',
    amount: 5.80,
    type: 'bid',
    status: 'pending',
  },
];

const sampleConversations = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    participant1_id: '00000000-0000-0000-0000-000000000001',
    participant2_id: '00000000-0000-0000-0000-000000000002',
    last_message_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    participant1_id: '00000000-0000-0000-0000-000000000003',
    participant2_id: '00000000-0000-0000-0000-000000000004',
    last_message_at: new Date().toISOString(),
  },
];

const sampleMessages = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    conversation_id: '00000000-0000-0000-0000-000000000001',
    sender_id: '00000000-0000-0000-0000-000000000001',
    recipient_id: '00000000-0000-0000-0000-000000000002',
    content: 'Hey! I saw your bid on my artwork. Thank you for the interest!',
    message_type: 'text',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    conversation_id: '00000000-0000-0000-0000-000000000001',
    sender_id: '00000000-0000-0000-0000-000000000002',
    recipient_id: '00000000-0000-0000-0000-000000000001',
    content: 'Absolutely love your work! The surrealist style is incredible.',
    message_type: 'text',
  },
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Insert profiles
    console.log('Inserting profiles...');
    const { error: profilesError } = await supabase
      .from('profiles')
      .upsert(sampleUsers);

    if (profilesError) {
      console.error('Error inserting profiles:', profilesError);
      return;
    }

    // Insert NFTs
    console.log('Inserting NFTs...');
    const { error: nftsError } = await supabase
      .from('nfts')
      .upsert(sampleNFTs);

    if (nftsError) {
      console.error('Error inserting NFTs:', nftsError);
      return;
    }

    // Insert orders
    console.log('Inserting orders...');
    const { error: ordersError } = await supabase
      .from('orders')
      .upsert(sampleOrders);

    if (ordersError) {
      console.error('Error inserting orders:', ordersError);
      return;
    }

    // Insert conversations
    console.log('Inserting conversations...');
    const { error: conversationsError } = await supabase
      .from('conversations')
      .upsert(sampleConversations);

    if (conversationsError) {
      console.error('Error inserting conversations:', conversationsError);
      return;
    }

    // Insert messages
    console.log('Inserting messages...');
    const { error: messagesError } = await supabase
      .from('messages')
      .upsert(sampleMessages);

    if (messagesError) {
      console.error('Error inserting messages:', messagesError);
      return;
    }

    console.log('✅ Database seeded successfully!');
    console.log('Sample data includes:');
    console.log(`- ${sampleUsers.length} users`);
    console.log(`- ${sampleNFTs.length} NFTs`);
    console.log(`- ${sampleOrders.length} orders`);
    console.log(`- ${sampleConversations.length} conversations`);
    console.log(`- ${sampleMessages.length} messages`);

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seeding function
seedDatabase();
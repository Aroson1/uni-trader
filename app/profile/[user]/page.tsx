import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ProfileContent } from './profile-content';
import { ProfileSkeleton } from './profile-skeleton';

async function getUserData(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  // Get user's NFTs
  const { data: nfts } = await supabase
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
      created_at
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  // Get user's created NFTs
  const { data: createdNfts } = await supabase
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
      created_at
    `)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  // Get user's purchases
  const { data: purchases } = await supabase
    .from('orders')
    .select(`
      id,
      amount,
      created_at,
      status,
      nft:nfts(
        id,
        title,
        media_url,
        price
      )
    `)
    .eq('buyer_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  // Get user statistics
  const { data: totalSales } = await supabase
    .from('orders')
    .select('amount')
    .eq('seller_id', userId)
    .eq('status', 'completed');

  const totalVolume = totalSales?.reduce((sum, order) => sum + order.amount, 0) || 0;
  const totalLikes = nfts?.reduce((sum, nft) => sum + (nft.likes || 0), 0) || 0;

  return {
    ...profile,
    nfts: nfts || [],
    createdNfts: createdNfts || [],
    purchases: purchases || [],
    stats: {
      totalNfts: nfts?.length || 0,
      totalCreated: createdNfts?.length || 0,
      totalVolume,
      totalLikes,
      totalPurchases: purchases?.length || 0,
    },
  };
}

interface ProfilePageProps {
  params: {
    user: string;
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const userData = await getUserData(params.user);

  if (!userData) {
    notFound();
  }

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent user={userData} />
    </Suspense>
  );
}
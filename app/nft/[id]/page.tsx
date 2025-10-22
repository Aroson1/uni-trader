import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NFTDetailsContent } from './nft-details-content';
import { NFTDetailsSkeleton } from './nft-details-skeleton';

async function getNFTData(id: string) {
  const supabase = createServerSupabaseClient();
  
  const { data: nft, error } = await supabase
    .from('nfts')
    .select(`
      *,
      owner:owner_id(id, name, avatar_url, wallet_address),
      creator:creator_id(id, name, avatar_url, wallet_address),
      bids(
        id,
        amount,
        status,
        created_at,
        bidder:profiles(id, name, avatar_url)
      ),
      likes(user_id)
    `)
    .eq('id', id)
    .eq('status', 'available')
    .single();

  if (error || !nft) {
    return null;
  }

  // Get recent activity for this NFT
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      amount,
      status,
      created_at,
      buyer:profiles!orders_buyer_id_fkey(name, avatar_url)
    `)
    .eq('nft_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    ...nft,
    orders: orders || [],
    bidCount: nft.bids?.length || 0,
    likeCount: nft.likes?.length || 0,
    bids: nft.bids?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [],
  };
}

interface NFTPageProps {
  params: {
    id: string;
  };
}

export default async function NFTPage({ params }: NFTPageProps) {
  const nftData = await getNFTData(params.id);

  if (!nftData) {
    notFound();
  }

  return (
    <Suspense fallback={<NFTDetailsSkeleton />}>
      <NFTDetailsContent nft={nftData} />
    </Suspense>
  );
}
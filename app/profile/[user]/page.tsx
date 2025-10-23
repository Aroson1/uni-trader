import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ProfileContent } from "./profile-content";
import { ProfileSkeleton } from "./profile-skeleton";

async function getUserData(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return null;
  }

  // Get user's created NFTs (originally minted by them)
  const { data: createdNfts } = await supabase
    .from("nfts")
    .select(
      `
      id,
      title,
      media_url,
      price,
      status,
      sale_type,
      likes,
      views,
      created_at
    `
    )
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  // Get user's purchased NFTs (NFTs they currently own but didn't create)
  // This shows NFTs immediately after purchase, even before verification
  const { data: ownedNfts } = await supabase
    .from("nfts")
    .select(
      `
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
      creator:profiles!nfts_creator_id_fkey(id, name, avatar_url)
    `
    )
    .eq("owner_id", userId)
    .neq("creator_id", userId)
    .order("created_at", { ascending: false });

  // Transform owned NFTs to match the expected purchased format
  const purchasedNfts = ownedNfts?.map((nft) => ({
    id: nft.id,
    price: nft.price,
    created_at: nft.created_at,
    status: nft.status,
    nft: {
      id: nft.id,
      title: nft.title,
      media_url: nft.media_url,
      price: nft.price,
      status: nft.status,
      sale_type: nft.sale_type,
      likes: nft.likes,
      views: nft.views,
      creator_id: nft.creator_id,
      creator: nft.creator,
    },
  }));

  // Get user's sales (NFTs they sold to others)
  const { data: soldNfts } = await supabase
    .from("orders")
    .select(
      `
      id,
      price,
      created_at,
      status,
      buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
      nft:nfts(
        id,
        title,
        media_url,
        price,
        status,
        sale_type,
        likes,
        views
      )
    `
    )
    .eq("seller_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  // Get pending orders (awaiting verification)
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select(
      `
      id,
      price,
      created_at,
      status,
      verification_code,
      buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
      seller:profiles!orders_seller_id_fkey(id, name, avatar_url),
      nft:nfts(
        id,
        title,
        media_url,
        price
      )
    `
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .eq("status", "awaiting_verification")
    .order("created_at", { ascending: false });

  // Get user statistics
  const { data: totalSales } = await supabase
    .from("orders")
    .select("price")
    .eq("seller_id", userId)
    .eq("status", "completed");

  const totalVolume =
    totalSales?.reduce((sum, order) => sum + order.price, 0) || 0;
  const totalLikes =
    createdNfts?.reduce((sum, nft) => sum + (nft.likes || 0), 0) || 0;

  return {
    ...profile,
    createdNfts: createdNfts || [],
    purchasedNfts: purchasedNfts || [],
    soldNfts: soldNfts || [],
    pendingOrders: pendingOrders || [],
    stats: {
      totalCreated: createdNfts?.length || 0,
      totalPurchased: ownedNfts?.length || 0,
      totalSold: soldNfts?.length || 0,
      totalVolume,
      totalLikes,
      pendingOrders: pendingOrders?.length || 0,
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

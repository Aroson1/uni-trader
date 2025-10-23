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
  const { data: createdNfts, error: createdNftsError } = await supabase
    .from("nfts")
    .select(
      `
      id,
      title,
      media_url,
      price,
      status,
      sale_type,
      views,
      created_at
    `
    )
    .eq("creator_id", userId)
    .in("status", ["active", "available", "sold", "draft"]) // Include all statuses for created NFTs
    .order("created_at", { ascending: false });

  if (createdNftsError) {
    console.error("Error fetching created NFTs:", createdNftsError);
  }

  // Add likes count to created NFTs
  const createdNftsWithLikes = await Promise.all(
    (createdNfts || []).map(async (nft) => {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact" })
        .eq("nft_id", nft.id);
      
      return {
        ...nft,
        likes: count || 0,
      };
    })
  );

  // Get user's purchased NFTs (NFTs they currently own but didn't create)
  // This shows NFTs immediately after purchase, even before verification
  const { data: ownedNfts, error: ownedNftsError } = await supabase
    .from("nfts")
    .select(
      `
      id,
      title,
      media_url,
      price,
      status,
      sale_type,
      views,
      created_at,
      creator_id,
      creator:profiles!nfts_creator_id_fkey(id, name, avatar_url)
    `
    )
    .eq("owner_id", userId)
    .neq("creator_id", userId)
    .in("status", ["active", "available", "sold", "cancelled"]) // Only show non-draft NFTs for owned
    .order("created_at", { ascending: false });

  if (ownedNftsError) {
    console.error("Error fetching owned NFTs:", ownedNftsError);
  }

  // Transform owned NFTs to match the expected purchased format
  const purchasedNfts = ownedNfts?.map((nft) => ({
    id: nft.id,
    price: nft.price || 0,
    created_at: nft.created_at,
    status: nft.status,
    nft: {
      id: nft.id,
      title: nft.title,
      media_url: nft.media_url,
      price: nft.price || 0,
      status: nft.status,
      sale_type: nft.sale_type,
      likes: 0, // We'll fetch likes separately if needed
      views: nft.views || 0,
      creator_id: nft.creator_id,
      creator: Array.isArray(nft.creator) ? nft.creator[0] : nft.creator,
    },
  })) || [];

  // Get user's sales (NFTs they sold to others)
  const { data: soldNfts, error: soldNftsError } = await supabase
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
        views
      )
    `
    )
    .eq("seller_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (soldNftsError) {
    console.error("Error fetching sold NFTs:", soldNftsError);
  }

  // Get pending orders (awaiting verification)
  const { data: pendingOrders, error: pendingOrdersError } = await supabase
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

  if (pendingOrdersError) {
    console.error("Error fetching pending orders:", pendingOrdersError);
  }

  // Get user statistics
  const { data: totalSales } = await supabase
    .from("orders")
    .select("price")
    .eq("seller_id", userId)
    .eq("status", "completed");

  const totalVolume =
    totalSales?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
  // Get total likes for user's created NFTs
  const { data: likesData } = await supabase
    .from("likes")
    .select("nft_id")
    .in("nft_id", createdNfts?.map(nft => nft.id) || []);
  
  const totalLikes = likesData?.length || 0;

  // Debug logging
  console.log(`Profile data for user ${userId}:`, {
    userId,
    createdNftsCount: createdNftsWithLikes?.length || 0,
    ownedNftsCount: ownedNfts?.length || 0,
    purchasedNftsCount: purchasedNfts?.length || 0,
    soldNftsCount: soldNfts?.length || 0,
    pendingOrdersCount: pendingOrders?.length || 0,
  });

  return {
    ...profile,
    createdNfts: createdNftsWithLikes || [],
    purchasedNfts: purchasedNfts,
    soldNfts: soldNfts || [],
    pendingOrders: pendingOrders || [],
    stats: {
      totalCreated: createdNftsWithLikes?.length || 0,
      totalPurchased: purchasedNfts?.length || 0,
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NFTCard } from "@/components/nft/nft-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, TrendingUp, Users, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { HeroSection } from "@/components/layout/hero-section";

interface NFT {
  id: string;
  title: string;
  media_url: string;
  price: number;
  likes_count?: number;
  views?: number;
  sale_type: "fixed" | "auction";
  auction_end_time?: string | null;
  status: "available" | "sold" | "draft";
  ar_link?: string | null;
  creator: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  owner: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

interface TopSeller {
  id: string;
  name: string;
  avatar_url?: string | null;
  total_sales: number;
  nft_count: number;
}

export default function HomePage() {
  const [featuredNFTs, setFeaturedNFTs] = useState<NFT[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArtworks: 0,
    totalArtists: 0,
    totalAuctions: 0,
  });

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);

      // Fetch featured NFTs (latest 4 available NFTs)
      const { data: nfts, error: nftsError } = await supabase
        .from("nfts")
        .select(
          `
          id,
          title,
          media_url,
          price,
          sale_type,
          auction_end_time,
          status,
          views,
          ar_link,
          creator:creator_id(id, name, avatar_url),
          owner:owner_id(id, name, avatar_url),
          likes_count:likes(count)
        `
        )
        .in("status", ["active", "available"])
        .order("created_at", { ascending: false })
        .limit(4);

      if (nftsError) {
        console.error("Error fetching NFTs:", nftsError);
        toast.error("Failed to load featured NFTs");
      } else {
        const transformedNFTs = (nfts || []).map((nft) => ({
          ...nft,
          creator: Array.isArray(nft.creator) ? nft.creator[0] : nft.creator,
          owner: Array.isArray(nft.owner) ? nft.owner[0] : nft.owner,
          likes_count: Array.isArray(nft.likes_count)
            ? nft.likes_count.length
            : 0,
        }));
        setFeaturedNFTs(transformedNFTs);
      }

      // Fetch top sellers (simplified for now - using profile with NFT counts)
      const { data: sellers, error: sellersError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          name,
          avatar_url
        `
        )
        .limit(4);

      if (sellersError) {
        console.error("Error fetching sellers:", sellersError);
      } else {
        const transformedSellers = (sellers || []).map((seller, index) => ({
          id: seller.id,
          name: seller.name,
          avatar_url: seller.avatar_url,
          total_sales: Math.random() * 50 + 10, // Mock data for now
          nft_count: Math.floor(Math.random() * 20) + 5, // Mock data for now
        }));
        setTopSellers(transformedSellers);
      }

      // Fetch stats
      const [
        { count: totalArtworks },
        { count: totalArtists },
        { count: totalAuctions },
      ] = await Promise.all([
        supabase
          .from("nfts")
          .select("*", { count: "exact", head: true })
          .in("status", ["active", "available"]),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("nfts")
          .select("*", { count: "exact", head: true })
          .eq("sale_type", "auction")
          .in("status", ["active", "available"]),
      ]);

      setStats({
        totalArtworks: totalArtworks || 0,
        totalArtists: totalArtists || 0,
        totalAuctions: totalAuctions || 0,
      });
    } catch (error) {
      console.error("Error fetching home data:", error);
      toast.error("Failed to load marketplace data");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative  overflow-hidden">
        {/* <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg')] bg-cover bg-center opacity-5"></div> */}

        <HeroSection />
      </section>

      <section className="section-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="mb-2">Live Auctions</h2>
            <p className="text-muted-foreground">
              Bid on exclusive NFTs before time runs out
            </p>
          </div>
          <Button variant="outline" className="btn-secondary" asChild>
            <Link href="/explore?filter=auction">
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                <div className="aspect-square bg-muted rounded-xl mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : featuredNFTs.length > 0 ? (
            featuredNFTs.map((nft, i) => (
              <motion.div
                key={nft.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <NFTCard
                  id={nft.id}
                  title={nft.title}
                  media_url={nft.media_url}
                  price={nft.price}
                  likes={nft.likes_count || 0}
                  views={nft.views || 0}
                  sale_type={nft.sale_type}
                  auction_end_time={nft.auction_end_time}
                  ar_link={nft.ar_link}
                  status={
                    nft.status === "available"
                      ? "available"
                      : (nft.status as "sold" | "draft")
                  }
                  creator={nft.creator}
                  owner={nft.owner}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No items available yet. Be the first to create one!
              </p>
              <Button className="mt-4" asChild>
                <Link href="/create">Create Item</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="section-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="mb-2">Top Sellers</h2>
            <p className="text-muted-foreground">
              Meet the most successful creators this month
            </p>
          </div>
          <Button variant="outline" className="btn-secondary" asChild>
            <Link href="/rankings">
              View Rankings
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topSellers.map((seller, i) => (
            <motion.div
              key={seller.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="h-full"
            >
              <Link href={`/profile/${seller.id}`} className="block h-full">
                <div className="glass rounded-2xl p-6 hover:scale-105 transition-all cursor-pointer h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={seller.avatar_url || undefined} />
                        <AvatarFallback>{seller.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{seller.name}</h4>
                      <p className="text-sm text-muted-foreground">Creator</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border mt-auto">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Sales
                    </p>
                    <p className="font-bold text-lg">
                      {seller.total_sales.toFixed(2)} KFC
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section-container">
        <div className="glass rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg opacity-10"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="mb-4">Start Your Trading Journey Today</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Create, sell, and collect unique digital assets. Join the
              Unitrader community and be part of the future of digital
              ownership.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button size="lg" className="btn-primary" asChild>
                <Link href="/auth/register">Get Started Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="btn-secondary"
                asChild
              >
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

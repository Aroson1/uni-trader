"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/avatar-generator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Package, DollarSign, Medal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface RankedSeller {
  id: string;
  name: string;
  avatar_url?: string | null;
  total_sales: number;
  items_sold: number;
  total_volume: number;
  created_nfts: number;
}

export default function RankingsPage() {
  const [sellers, setSellers] = useState<RankedSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"items_sold" | "volume">("items_sold");

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);

      // Fetch all profiles with their sales data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast.error("Failed to load rankings");
        return;
      }

      // For each profile, calculate their statistics
      const rankingsPromises = profiles.map(async (profile) => {
        // Count completed sales (where user is the seller)
        const { data: completedOrders, error: ordersError } = await supabase
          .from("orders")
          .select("amount, nft_id")
          .eq("seller_id", profile.id)
          .eq("status", "completed");

        // Count total NFTs created by this user
        const { count: createdCount } = await supabase
          .from("nfts")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", profile.id);

        const itemsSold = completedOrders?.length || 0;
        const totalVolume = completedOrders?.reduce(
          (sum, order) => sum + (order.amount || 0),
          0
        ) || 0;

        return {
          id: profile.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          items_sold: itemsSold,
          total_volume: totalVolume,
          total_sales: totalVolume,
          created_nfts: createdCount || 0,
        };
      });

      const rankings = await Promise.all(rankingsPromises);

      // Sort by items sold (default) and filter out users with no sales
      const sortedRankings = rankings
        .filter((r) => r.items_sold > 0 || r.created_nfts > 0)
        .sort((a, b) => b.items_sold - a.items_sold);

      setSellers(sortedRankings);
    } catch (error) {
      console.error("Error fetching rankings:", error);
      toast.error("Failed to load rankings");
    } finally {
      setLoading(false);
    }
  };

  const getSortedSellers = () => {
    if (sortBy === "items_sold") {
      return [...sellers].sort((a, b) => b.items_sold - a.items_sold);
    } else {
      return [...sellers].sort((a, b) => b.total_volume - a.total_volume);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    if (rank === 3) return "bg-gradient-to-r from-amber-500 to-amber-700 text-white";
    return "bg-secondary text-secondary-foreground";
  };

  const sortedSellers = getSortedSellers();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Top Rankings</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Creator Rankings
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the most successful creators based on their sales and contributions
          </p>
        </motion.div>

        {/* Sort Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "items_sold" | "volume")} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12">
              <TabsTrigger value="items_sold" className="gap-2">
                <Package className="w-4 h-4" />
                Items Sold
              </TabsTrigger>
              <TabsTrigger value="volume" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Sales Volume
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Top 3 Podium */}
        {sortedSellers.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
              {/* 2nd Place */}
              <div className="flex flex-col items-center pt-8">
                <Link href={`/profile/${sortedSellers[1].id}`} className="group">
                  <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${getRankBadge(2)}`} />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-block mb-4">
                        <Avatar className="w-20 h-20 border-4 border-gray-400">
                          <AvatarImage src={getUserAvatar(sortedSellers[1].name, sortedSellers[1].avatar_url)} />
                          <AvatarFallback className="text-xl">
                            {sortedSellers[1].name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2">
                          {getRankIcon(2)}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1 truncate">{sortedSellers[1].name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">
                          {sortBy === "items_sold"
                            ? `${sortedSellers[1].items_sold} items sold`
                            : `${sortedSellers[1].total_volume.toFixed(2)} ETH`}
                        </p>
                        <p>{sortedSellers[1].created_nfts} items created</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <Link href={`/profile/${sortedSellers[0].id}`} className="group">
                  <Card className="relative overflow-hidden hover:shadow-xl transition-shadow">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${getRankBadge(1)}`} />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-block mb-4">
                        <Avatar className="w-24 h-24 border-4 border-yellow-500 ring-4 ring-yellow-500/20">
                          <AvatarImage src={getUserAvatar(sortedSellers[0].name, sortedSellers[0].avatar_url)} />
                          <AvatarFallback className="text-2xl">
                            {sortedSellers[0].name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2">
                          {getRankIcon(1)}
                        </div>
                      </div>
                      <Badge className="mb-2 bg-yellow-500 hover:bg-yellow-600 text-white">
                        Top Creator
                      </Badge>
                      <h3 className="font-bold text-xl mb-1 truncate">{sortedSellers[0].name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="font-semibold text-lg text-foreground">
                          {sortBy === "items_sold"
                            ? `${sortedSellers[0].items_sold} items sold`
                            : `${sortedSellers[0].total_volume.toFixed(2)} ETH`}
                        </p>
                        <p>{sortedSellers[0].created_nfts} items created</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center pt-8">
                <Link href={`/profile/${sortedSellers[2].id}`} className="group">
                  <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${getRankBadge(3)}`} />
                    <CardContent className="p-6 text-center">
                      <div className="relative inline-block mb-4">
                        <Avatar className="w-20 h-20 border-4 border-amber-600">
                          <AvatarImage src={getUserAvatar(sortedSellers[2].name, sortedSellers[2].avatar_url)} />
                          <AvatarFallback className="text-xl">
                            {sortedSellers[2].name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2">
                          {getRankIcon(3)}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1 truncate">{sortedSellers[2].name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">
                          {sortBy === "items_sold"
                            ? `${sortedSellers[2].items_sold} items sold`
                            : `${sortedSellers[2].total_volume.toFixed(2)} ETH`}
                        </p>
                        <p>{sortedSellers[2].created_nfts} items created</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Rankings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-6">All Rankings</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading rankings...</p>
              </div>
            ) : sortedSellers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No rankings available yet</p>
              </div>
            ) : (
              sortedSellers.map((seller, index) => (
                <motion.div
                  key={seller.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={`/profile/${seller.id}`}>
                    <Card className="hover:shadow-md transition-all hover:border-primary/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankBadge(index + 1)}`}>
                            {index < 3 ? getRankIcon(index + 1) : `#${index + 1}`}
                          </div>

                          {/* Avatar & Name */}
                          <Avatar className="w-14 h-14 flex-shrink-0">
                            <AvatarImage src={getUserAvatar(seller.name, seller.avatar_url)} />
                            <AvatarFallback>
                              {seller.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{seller.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {seller.created_nfts} items created
                            </p>
                          </div>

                          {/* Stats */}
                          <div className="flex gap-6 items-center">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">Items Sold</p>
                              <p className="font-bold text-lg">{seller.items_sold}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
                              <p className="font-bold text-lg">{seller.total_volume.toFixed(2)} ETH</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

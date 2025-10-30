"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useOptionalAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/avatar-generator";
import { BidComponent } from "@/components/nft/bid-component";
import { NFTCard } from "@/components/nft/nft-card";
import { Separator } from "@/components/ui/separator";
import { Countdown } from "@/components/ui/countdown";
import { Input } from "@/components/ui/input";
import {
  Heart,
  Eye,
  Share2,
  Clock,
  User,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";

interface NFTDetailsContentProps {
  nft: {
    id: string;
    title: string;
    description: string;
    media_url: string;
    price: number;
    status: string;
    sale_type: string;
    category: string;
    tags: string[];
    views: number;
    auction_end_time?: string;
    created_at: string;
    owner: {
      id: string;
      name: string;
      avatar_url?: string;
      wallet_address?: string;
    };
    creator: {
      id: string;
      name: string;
      avatar_url?: string;
      wallet_address?: string;
    };
    bids: Array<{
      id: string;
      amount: number;
      status: string;
      created_at: string;
      bidder: {
        id: string;
        name: string;
        avatar_url?: string;
      };
    }>;
    orders: Array<{
      id: string;
      amount: number;
      status: string;
      created_at: string;
      buyer: {
        name: string;
        avatar_url?: string;
      };
    }>;
    bidCount: number;
    likeCount: number;
  };
}

export function NFTDetailsContent({ nft }: NFTDetailsContentProps) {
  const { user, profile, loading: authLoading, isAuthenticated } = useOptionalAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(nft.likeCount);
  const [bidAmount, setBidAmount] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [currentBids, setCurrentBids] = useState(nft.bids);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [relatedNFTs, setRelatedNFTs] = useState<any[]>([]);

  const isAuction = nft.sale_type === "auction";
  const highestBid = currentBids[0]?.amount || nft.price;
  const isAuctionActive =
    isAuction &&
    nft.auction_end_time &&
    new Date(nft.auction_end_time) > new Date();

  useEffect(() => {
    // Use user from auth hook instead of fetching again
    if (user && profile) {
      setCurrentUser(profile);
      
      // Check if user has liked this Item
      const checkLike = async () => {
        const { data: like } = await supabase
          .from("likes")
          .select("*")
          .eq("user_id", user.id)
          .eq("nft_id", nft.id)
          .single();
        setIsLiked(!!like);
      };
      checkLike();
    } else if (user) {
      // Fallback if profile not loaded yet
      setCurrentUser({
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        email: user.email
      });
    } else {
      setCurrentUser(null);
      setIsLiked(false);
    }
  }, [user, profile, nft.id]);

  useEffect(() => {

    // Set up realtime subscription for bids
    const channel = supabase
      .channel(`nft-${nft.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `nft_id=eq.${nft.id}`,
        },
        (payload) => {
          // Fetch the new bid with bidder info
          const fetchNewBid = async () => {
            const { data } = await supabase
              .from("bids")
              .select(
                `
                id,
                amount,
                status,
                created_at,
                bidder:profiles(id, name, avatar_url)
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setCurrentBids((prev) => [data as any, ...prev]);
            }
          };
          fetchNewBid();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Fetch related NFTs based on category
    const fetchRelatedNFTs = async () => {
      const { data } = await supabase
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
          creator:creator_id(id, name, avatar_url),
          owner:owner_id(id, name, avatar_url),
          likes(user_id),
          views
        `
        )
        .eq("category", nft.category)
        .eq("status", "available")
        .neq("id", nft.id)
        .limit(4);

      if (data) {
        setRelatedNFTs(
          data.map((item: any) => ({
            ...item,
            likes: item.likes?.length || 0,
          }))
        );
      }
    };
    fetchRelatedNFTs();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [nft.id, nft.category]);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please login to like this Item");
      return;
    }

    if (isLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("nft_id", nft.id);

      if (!error) {
        setIsLiked(false);
        setLikes((prev) => prev - 1);
      }
    } else {
      const { error } = await supabase.from("likes").insert({
        user_id: currentUser.id,
        nft_id: nft.id,
      });

      if (!error) {
        setIsLiked(true);
        setLikes((prev) => prev + 1);
      }
    }
  };

  const handlePlaceBid = async () => {
    if (!currentUser) {
      toast.error("Please login to place a bid");
      return;
    }

    const amount = parseFloat(bidAmount);
    if (!amount || amount <= highestBid) {
      toast.error(`Bid must be higher than ${highestBid} KFC`);
      return;
    }

    setIsPlacingBid(true);

    const { error } = await supabase.from("bids").insert({
      nft_id: nft.id,
      bidder_id: currentUser.id,
      amount,
      status: "active",
    });

    if (error) {
      toast.error("Failed to place bid");
    } else {
      toast.success("Bid placed successfully!");
      setBidAmount("");
    }

    setIsPlacingBid(false);
  };

  const handleBuyNow = async () => {
    if (!currentUser) {
      toast.error("Please login to purchase");
      return;
    }

    // Create order
    const { error } = await supabase.from("orders").insert({
      nft_id: nft.id,
      buyer_id: currentUser.id,
      seller_id: nft.owner.id,
      amount: nft.price,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to create order");
    } else {
      toast.success("Order created! Please complete payment.");
    }
  };

  const handleShare = () => {
    if (typeof navigator === "undefined" || typeof window === "undefined")
      return;

    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
        {/* Main NFT Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Left: NFT Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative lg:sticky lg:top-8 h-fit"
          >
            <div className="aspect-square relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-200/20 to-purple-200/20 backdrop-blur-sm border border-border/50 shadow-2xl">
              <Image
                src={nft.media_url}
                alt={nft.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>

          {/* Right: NFT Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-5"
          >
            {/* Title and Action Buttons */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground flex-1 leading-tight">
                {nft.title}
              </h1>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-secondary/80"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Stats - Views and Likes */}
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-5 w-5" />
                <span className="font-medium text-base">{nft.views}</span>
              </div>
              <button
                onClick={handleLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart
                  className={`h-5 w-5 transition-all ${isLiked ? "fill-primary text-primary scale-110" : ""}`}
                />
                <span className="font-medium text-base">{likes}</span>
              </button>
            </div>

            {/* Owner & Creator Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-3.5 border border-border/30 hover:border-primary/30 transition-colors">
                <p className="text-xs text-muted-foreground mb-2">Owned By</p>
                <Link href={`/profile/${nft.owner.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={getUserAvatar(nft.owner.name, nft.owner.avatar_url)} />
                    <AvatarFallback className="text-xs">
                      {nft.owner.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm truncate">{nft.owner.name}</span>
                </Link>
              </div>

              <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-3.5 border border-border/30 hover:border-accent/30 transition-colors">
                <p className="text-xs text-muted-foreground mb-2">Create By</p>
                <Link href={`/profile/${nft.creator.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <Avatar className="h-9 w-9 border-2 border-accent/20">
                    <AvatarImage src={getUserAvatar(nft.creator.name, nft.creator.avatar_url)} />
                    <AvatarFallback className="text-xs">
                      {nft.creator.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm truncate">{nft.creator.name}</span>
                </Link>
              </div>
            </div>

            {/* Description */}
            <div className="bg-secondary/20 rounded-2xl p-4 border border-border/20">
              <p className="text-muted-foreground leading-relaxed text-sm">
                {nft.description}
              </p>
            </div>

            {/* Bid Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-4 border border-border/30 shadow-md">
                <p className="text-xs text-muted-foreground mb-1.5">Current Bid</p>
                <p className="text-2xl font-bold">{highestBid} ETH</p>
                <p className="text-xs text-muted-foreground mt-0.5">≈ ${(highestBid * 3000).toFixed(2)}</p>
              </div>

              {isAuctionActive && nft.auction_end_time ? (
                <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-4 border border-border/30 shadow-md">
                  <p className="text-xs text-muted-foreground mb-1.5">Countdown</p>
                  <div className="text-xl font-bold font-mono">
                    <Countdown endTime={nft.auction_end_time} />
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-4 border border-border/30 shadow-md">
                  <p className="text-xs text-muted-foreground mb-1.5">Sale Type</p>
                  <p className="text-2xl font-bold capitalize">{nft.sale_type}</p>
                </div>
              )}
            </div>

            {/* Place Bid Button or Owner Message */}
            {/* Chat with Seller Button */}
            {currentUser && currentUser.id !== nft.owner.id && (
              <Link href={`/chat/new?user=${nft.owner.id}&nft=${nft.id}`} className="block">
                <Button variant="outline" className="w-full rounded-2xl h-12 hover:bg-secondary/80 transition-colors">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Chat with Seller
                </Button>
              </Link>
            )}
            {currentUser && (currentUser.id === nft.owner.id || currentUser.id === nft.creator.id) ? (
              <div className="bg-secondary/30 rounded-2xl p-5 border border-border/30 text-center">
                <p className="text-muted-foreground font-medium">
                  {currentUser.id === nft.creator.id ? "You created this Item" : "You own this Item"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  You cannot bid on or purchase your own Item
                </p>
              </div>
            ) : (
              <BidComponent
                nftId={nft.id}
                currentPrice={nft.price}
                saleType={nft.sale_type as "fixed" | "auction" | "bid"}
                auctionEndTime={nft.auction_end_time}
                onBidPlaced={() => {
                  const fetchBids = async () => {
                    const { data } = await supabase
                      .from("bids")
                      .select(
                        `
                        id,
                        amount,
                        status,
                        created_at,
                        bidder:profiles(id, name, avatar_url)
                      `
                      )
                      .eq("nft_id", nft.id)
                      .eq("status", "active")
                      .order("amount", { ascending: false });

                    if (data) {
                      setCurrentBids(data as any);
                    }
                  };
                  fetchBids();
                  toast.success("Bid placed successfully!");
                }}
                onPurchase={() => {
                  toast.success("Item purchased successfully!");
                }}
              />
            )}

            {/* Tabs Section */}
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-secondary/50 h-11">
                <TabsTrigger value="history" className="text-sm">Bid History</TabsTrigger>
                <TabsTrigger value="info" className="text-sm">Info</TabsTrigger>
                <TabsTrigger value="provenance" className="text-sm">Provenance</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-3 mt-5">
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                  {currentBids.length > 0 ? (
                    currentBids.map((bid) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all hover:shadow-md border border-transparent hover:border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={getUserAvatar(bid.bidder.name, bid.bidder.avatar_url)} />
                            <AvatarFallback className="text-sm">
                              {bid.bidder.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{bid.bidder.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {bid.created_at ? formatDistance(
                                new Date(bid.created_at),
                                new Date(),
                                { addSuffix: true }
                              ) : 'placed a bid'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base">{bid.amount} ETH</p>
                          <p className="text-xs text-muted-foreground">≈ ${(bid.amount * 3000).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No bids yet. Be the first to bid!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="info" className="mt-5">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2.5 border-b border-border/30">
                    <span className="text-muted-foreground">Token ID:</span>
                    <span className="font-mono text-xs">{nft.id.slice(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-border/30">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium text-foreground">{nft.category}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-border/30">
                    <span className="text-muted-foreground">Sale Type:</span>
                    <span className="font-medium text-foreground capitalize">{nft.sale_type}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-border/30">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium text-foreground">
                      {new Date(nft.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {nft.tags.length > 0 && (
                    <div className="pt-3">
                      <p className="text-muted-foreground mb-2.5">Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {nft.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-secondary/50 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="provenance" className="mt-5">
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                  {nft.orders.length > 0 ? (
                    nft.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all hover:shadow-md border border-transparent hover:border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Purchase by {order.buyer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistance(
                                new Date(order.created_at),
                                new Date(),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base">{order.amount} ETH</p>
                          <Badge
                            variant={order.status === "completed" ? "default" : "secondary"}
                            className="mt-1 text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No trading history available</p>
                      <p className="text-xs mt-1">This item has not been traded yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            
          </motion.div>
        </div>

        {/* Related Items Section */}
        {relatedNFTs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 pt-12 border-t border-border/50"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Explore Related Items</h2>
                <p className="text-sm text-muted-foreground">More items from the {nft.category} category</p>
              </div>
              <Link href={`/explore?category=${nft.category}`}>
                <Button variant="outline" className="rounded-xl">
                  View All
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedNFTs.map((relatedNft) => (
                <NFTCard
                  key={relatedNft.id}
                  id={relatedNft.id}
                  title={relatedNft.title}
                  media_url={relatedNft.media_url}
                  price={relatedNft.price}
                  likes={relatedNft.likes}
                  views={relatedNft.views}
                  sale_type={relatedNft.sale_type}
                  auction_end_time={relatedNft.auction_end_time}
                  creator={relatedNft.creator}
                  owner={relatedNft.owner}
                  status={relatedNft.status}
                />
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <Footer />
    </div>
  );
}

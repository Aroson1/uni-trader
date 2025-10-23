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
import { BidComponent } from "@/components/nft/bid-component";
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
      
      // Check if user has liked this NFT
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

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [nft.id]);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please login to like this NFT");
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
      toast.error(`Bid must be higher than ${highestBid} ETH`);
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
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* NFT Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square relative rounded-2xl overflow-hidden bg-muted">
              <Image
                src={nft.media_url}
                alt={nft.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  {nft.category}
                </Badge>
                {isAuction && (
                  <Badge variant="destructive" className="bg-red-500/80">
                    <Clock className="w-3 h-3 mr-1" />
                    Auction
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>

          {/* NFT Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">{nft.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{nft.views} views</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span>{likes} likes</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {nft.description}
              </p>
            </div>

            {/* Owner & Creator Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={nft.owner.avatar_url} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">Owned by</p>
                      <Link
                        href={`/profile/${nft.owner.id}`}
                        className="font-medium hover:underline"
                      >
                        {nft.owner.name}
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={nft.creator.avatar_url} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Created by
                      </p>
                      <Link
                        href={`/profile/${nft.creator.id}`}
                        className="font-medium hover:underline"
                      >
                        {nft.creator.name}
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price & Auction Info */}
            <Card>
              <CardContent className="p-6">
                {/* Only show BidComponent if user is not the owner or creator */}
                {currentUser && (currentUser.id === nft.owner.id || currentUser.id === nft.creator.id) ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-muted-foreground">
                        {currentUser.id === nft.creator.id ? "You created this NFT" : "You own this NFT"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        You cannot bid on or purchase your own NFT
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-2xl font-bold">{nft.price} KFC</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Sale Type</p>
                        <p className="text-lg font-medium capitalize">{nft.sale_type}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <BidComponent
                    nftId={nft.id}
                    currentPrice={nft.price}
                    saleType={nft.sale_type as "fixed" | "auction" | "bid"}
                    auctionEndTime={nft.auction_end_time}
                    onBidPlaced={() => {
                      // Refresh bids data
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
                      toast.success("NFT purchased successfully!");
                      // You might want to redirect to success page
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLike} className="flex-1">
                <Heart
                  className={`w-4 h-4 mr-2 ${
                    isLiked ? "fill-current text-red-500" : ""
                  }`}
                />
                {likes}
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              {currentUser && currentUser.id !== nft.owner.id && (
                <Link href={`/chat/new?user=${nft.owner.id}&nft=${nft.id}`}>
                  <Button variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat with Seller
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <Tabs defaultValue="bids" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bids">
                Bids ({currentBids.length})
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="bids" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bid History</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentBids.length > 0 ? (
                    <div className="space-y-4">
                      {currentBids.map((bid, index) => (
                        <div
                          key={bid.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={bid.bidder.avatar_url} />
                              <AvatarFallback>
                                {bid.bidder.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{bid.bidder.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistance(
                                  new Date(bid.created_at),
                                  new Date(),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{bid.amount} ETH</p>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Highest bid
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No bids yet. Be the first to bid!
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trading History</CardTitle>
                </CardHeader>
                <CardContent>
                  {nft.orders.length > 0 ? (
                    <div className="space-y-4">
                      {nft.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">
                                Purchase by {order.buyer.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistance(
                                  new Date(order.created_at),
                                  new Date(),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{order.amount} ETH</p>
                            <Badge
                              variant={
                                order.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No trading history available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>NFT Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Token ID</p>
                      <p className="font-mono">{nft.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p>{nft.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p>{new Date(nft.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sale Type</p>
                      <p className="capitalize">{nft.sale_type}</p>
                    </div>
                  </div>

                  {nft.tags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {nft.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

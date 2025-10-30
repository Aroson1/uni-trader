"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useOptionalAuth } from "@/hooks/use-auth";
import { getUserAvatar } from "@/lib/avatar-generator";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WalletTopUp } from "@/components/wallet/wallet-top-up";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NFTCard } from "@/components/nft/nft-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Edit3,
  Wallet,
  MessageCircle,
  ExternalLink,
  Upload,
  Camera,
  TrendingUp,
  Heart,
  ShoppingBag,
  Palette,
  Share2,
  Copy,
  Check,
  Clock,
  Twitter,
  Send,
  Youtube,
  Music,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";

interface ProfileContentProps {
  user: {
    id: string;
    name: string;
    bio?: string;
    email?: string;
    avatar_url?: string;
    banner_url?: string;
    wallet_address?: string;
    wallet_balance?: number;
    created_at: string;
    createdNfts: Array<{
      id: string;
      title: string;
      media_url: string;
      price: number;
      status: string;
      sale_type: string;
      likes: number;
      views: number;
      created_at: string;
    }>;
    purchasedNfts: Array<{
      id: string;
      price: number;
      created_at: string;
      status: string;
      nft: {
        id: string;
        title: string;
        media_url: string;
        price: number;
        status: string;
        sale_type: string;
        likes: number;
        views: number;
        creator_id: string;
        creator: {
          id: string;
          name: string;
          avatar_url?: string;
        };
      };
    }>;
    soldNfts: Array<{
      id: string;
      price: number;
      created_at: string;
      status: string;
      buyer: {
        id: string;
        name: string;
        avatar_url?: string;
      };
      nft: {
        id: string;
        title: string;
        media_url: string;
        price: number;
        status: string;
        sale_type: string;
        likes: number;
        views: number;
      };
    }>;
    pendingOrders: Array<{
      id: string;
      price: number;
      created_at: string;
      status: string;
      verification_code: string;
      buyer: {
        id: string;
        name: string;
        avatar_url?: string;
      };
      seller: {
        id: string;
        name: string;
        avatar_url?: string;
      };
      nft: {
        id: string;
        title: string;
        media_url: string;
        price: number;
      };
    }>;
    stats: {
      totalCreated: number;
      totalPurchased: number;
      totalSold: number;
      totalVolume: number;
      totalLikes: number;
      pendingOrders: number;
    };
  };
}

export function ProfileContent({ user }: ProfileContentProps) {
  const {
    user: authUser,
    profile: authProfile,
    loading: authLoading,
    isAuthenticated,
  } = useOptionalAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name,
    bio: user.bio || "",
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Use auth user from hook instead of fetching again
    if (authUser && authProfile) {
      setCurrentUser(authProfile);
      setIsOwnProfile(authUser.id === user.id);
    } else if (authUser) {
      // Fallback if profile not loaded yet
      setCurrentUser({
        id: authUser.id,
        name: authUser.email?.split("@")[0] || "User",
        email: authUser.email,
      });
      setIsOwnProfile(authUser.id === user.id);
    } else {
      setCurrentUser(null);
      setIsOwnProfile(false);
    }
  }, [authUser, authProfile, user.id]);

  const handleCopyAddress = () => {
    if (user.wallet_address && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(user.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Wallet address copied!");
    }
  };

  const handleShareProfile = () => {
    if (typeof navigator === "undefined" || typeof window === "undefined")
      return;

    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(filePath, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from("media").getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar must be less than 5MB");
      return;
    }

    try {
      const avatarUrl = await uploadFile(file, "avatars");
      setAvatarPreview(avatarUrl);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Banner must be less than 10MB");
      return;
    }

    try {
      const bannerUrl = await uploadFile(file, "banners");
      setBannerPreview(bannerUrl);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;

    setIsUpdating(true);

    try {
      const updates: any = {
        name: editForm.name,
        bio: editForm.bio,
      };

      if (avatarPreview) {
        updates.avatar_url = avatarPreview;
      }

      if (bannerPreview) {
        updates.banner_url = bannerPreview;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      // Refresh the page to show updates
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color = "text-foreground",
  }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${color}`} />
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4">
        {/* Banner Section with Blurred Background Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative h-[400px] mt-8 mb-5 overflow-hidden rounded-3xl"
        >
          {/* Background Image with Blur */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <Image
              src={user.banner_url || "/bg-authors.jpg"}
              alt="Profile banner"
              fill
              className="object-cover blur-sm scale-105"
              priority
            />
            {/* Dark overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
          </div>

          {/* Edit Banner Button */}
          {isOwnProfile ? (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-6 right-6 z-10 backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/20"
              onClick={() => bannerInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-2" />
              Edit Banner
            </Button>
          ) : (
            <div className="flex items-center justify-end p-5">
              {/* Social Media Links */}
              <Button
                size="icon"
                variant="ghost"
                className="mr-2 rounded-full w-12 h-12 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              >
                <Twitter className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="mr-2 rounded-full w-12 h-12 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              >
                <Send className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="mr-2 rounded-full w-12 h-12 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              >
                <Youtube className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="mr-2 rounded-full w-12 h-12 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              >
                <Music className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                className="mr-2 backdrop-blur-md bg-primary/80 hover:bg-primary text-white font-semibold"
              >
                Follow
              </Button>
            </div>
          )}

          {/* Profile Content Overlay */}
          <div
            className={`relative h-full flex flex-col mt-3 px-8 ${
              isOwnProfile ? "justify-center" : "justify-start"
            }`}
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 max-w-7xl w-full">
              {/* Profile Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-44 h-44 border-4 border-white/20 backdrop-blur-sm shadow-2xl">
                  <AvatarImage src={getUserAvatar(user.name, user.avatar_url)} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/80 to-purple-600/80">
                    <User className="w-20 h-20" />
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 rounded-full w-10 h-10 p-0 backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/20"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera className="w-5 h-5" />
                    </Button>
                    
                    {/* Wallet Balance Highlight - Below Avatar */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-max">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 border-2 border-emerald-400/50 shadow-2xl">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-white" />
                            <div className="flex flex-col">
                              <span className="text-xs text-white/80 font-medium leading-none">Balance</span>
                              <span className="text-xl font-bold text-white leading-tight">
                                {(user.wallet_balance || 0).toFixed(2)} KFC
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {!isOwnProfile && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 right-2 rounded-full w-10 h-10 p-0 backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/20"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/80 tracking-wide uppercase">
                    Author Profile
                  </p>
                  <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                    {user.name}
                  </h1>
                  {user.bio ? (
                    <p className="text-base md:text-lg text-white/90 max-w-2xl leading-relaxed">
                      {user.bio}
                    </p>
                  ) : (
                    <p className="text-base md:text-lg text-white/70 max-w-2xl leading-relaxed italic">
                      ~No Bio~
                    </p>
                  )}
                </div>

                {/* Wallet Address */}
                {user.wallet_address && (
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <div className="px-4 py-2 rounded-xl border border-white/20 backdrop-blur-md bg-white/10 flex items-center gap-2">
                      <code className="text-sm text-white/90 font-mono">
                        {user.wallet_address.slice(0, 6)}...
                        {user.wallet_address.slice(-6)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-white/20"
                        onClick={handleCopyAddress}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/80" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stats Chips */}
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <Badge className="px-4 py-2 backdrop-blur-md bg-blue-500/20 text-blue-100 border-blue-400/30 hover:bg-blue-500/30">
                    <Palette className="w-4 h-4 mr-2" />
                    {user.stats.totalCreated} Items
                  </Badge>
                  <Badge className="px-4 py-2 backdrop-blur-md bg-red-500/20 text-red-100 border-red-400/30 hover:bg-red-500/30">
                    <Heart className="w-4 h-4 mr-2" />
                    {user.stats.totalLikes} Likes
                  </Badge>
                  <Badge className="px-4 py-2 backdrop-blur-md bg-white/10 text-white/90 border-white/20">
                    <Clock className="w-4 h-4 mr-2" />
                    Joined{" "}
                    {formatDistance(new Date(user.created_at), new Date(), {
                      addSuffix: true,
                    })}
                  </Badge>
                </div>

                {/* Share/Message Buttons */}
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareProfile}
                    className="backdrop-blur-md bg-white/5 border-white/20 hover:bg-white/10 text-white"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Profile
                  </Button>
                  {!isOwnProfile && currentUser && (
                    <Link href={`/chat/new?user=${user.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="backdrop-blur-md bg-white/5 border-white/20 hover:bg-white/10 text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row md:flex-row gap-3 flex-shrink-0">
                {isOwnProfile ? (
                  <>
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild>
                        <Button
                          size="lg"
                          className="backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
                        >
                          <Edit3 className="w-5 h-5 mr-2" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Display Name</Label>
                            <Input
                              id="edit-name"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-bio">Bio</Label>
                            <Textarea
                              id="edit-bio"
                              value={editForm.bio}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  bio: e.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </div>
                          <Button
                            onClick={handleSaveProfile}
                            disabled={isUpdating}
                            className="w-full"
                          >
                            {isUpdating ? "Updating..." : "Save Changes"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <WalletTopUp onSuccess={() => window.location.reload()} />
                  </>
                ) : (
                  <></>
                )}
              </div>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
          />
        </motion.div>

        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <Tabs defaultValue="created" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="created">
                Created ({user.stats.totalCreated})
              </TabsTrigger>
              <TabsTrigger value="purchased">
                Purchased ({user.stats.totalPurchased})
              </TabsTrigger>
              <TabsTrigger value="sold">
                Sold ({user.stats.totalSold})
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="orders">
                  Orders ({user.stats.pendingOrders})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="created" className="mt-6">
              {user.createdNfts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {user.createdNfts.map((nft) => (
                    <div key={nft.id} className="relative">
                      <NFTCard
                        {...nft}
                        sale_type={nft.sale_type as "fixed" | "auction" | "bid"}
                        status={
                          nft.status as
                            | "available"
                            | "sold"
                            | "auction"
                            | "draft"
                        }
                        creator={{
                          id: user.id,
                          name: user.name,
                          avatar_url: user.avatar_url,
                        }}
                        owner={{
                          id: user.id,
                          name: user.name,
                          avatar_url: user.avatar_url,
                        }}
                      />
                      {nft.status === "sold" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <Badge
                            variant="destructive"
                            className="text-lg font-semibold"
                          >
                            SOLD
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No items created</h3>
                  <p className="text-muted-foreground mb-4">
                    {isOwnProfile
                      ? "Create your first item to get started"
                      : "This user hasn't created any items yet"}
                  </p>
                  {isOwnProfile && (
                    <Link href="/create">
                      <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Create Item
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="purchased" className="mt-6">
              {user.purchasedNfts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {user.purchasedNfts.map((purchase) => (
                    <div key={purchase.id} className="relative">
                      <NFTCard
                        {...purchase.nft}
                        sale_type={
                          purchase.nft.sale_type as "fixed" | "auction" | "bid"
                        }
                        status={
                          purchase.nft.status as
                            | "available"
                            | "sold"
                            | "auction"
                            | "draft"
                        }
                        creator={purchase.nft.creator}
                        owner={{
                          id: user.id,
                          name: user.name,
                          avatar_url: user.avatar_url,
                        }}
                      />
                      {purchase.status === "sold" && (
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-500/90 text-white border-green-600"
                          >
                            Owned
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    No NFTs purchased
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile
                      ? "Start collecting NFTs to see them here"
                      : "This user hasn't purchased any NFTs yet"}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sold" className="mt-6">
              {user.soldNfts.length > 0 ? (
                <div className="space-y-4">
                  {user.soldNfts.map((sale) => (
                    <Card key={sale.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={sale.nft.media_url}
                              alt={sale.nft.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <Link
                              href={`/nft/${sale.nft.id}`}
                              className="font-medium hover:underline"
                            >
                              {sale.nft.title}
                            </Link>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Sold for {sale.price} KFC</span>
                              <span>to {sale.buyer.name}</span>
                              <span>
                                {formatDistance(
                                  new Date(sale.created_at),
                                  new Date(),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Sold
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No sales yet</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile
                      ? "Create and sell NFTs to see your sales here"
                      : "This user hasn't sold any NFTs yet"}
                  </p>
                </div>
              )}
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="orders" className="mt-6">
                {user.pendingOrders.length > 0 ? (
                  <div className="space-y-4">
                    {user.pendingOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                              <Image
                                src={order.nft.media_url}
                                alt={order.nft.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <Link
                                href={`/nft/${order.nft.id}`}
                                className="font-medium hover:underline"
                              >
                                {order.nft.title}
                              </Link>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{order.price} KFC</span>
                                <span>
                                  {order.buyer.id === user.id
                                    ? `From ${order.seller.name}`
                                    : `To ${order.buyer.name}`}
                                </span>
                                <span>
                                  {formatDistance(
                                    new Date(order.created_at),
                                    new Date(),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-600"
                              >
                                Awaiting Verification
                              </Badge>
                              {order.seller.id === user.id && (
                                <Link href="/qr/generate">
                                  <Button variant="outline" size="sm">
                                    Generate QR
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">
                      No pending orders
                    </h3>
                    <p className="text-muted-foreground">
                      All your orders have been completed or you don't have any
                      pending transactions
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

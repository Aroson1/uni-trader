'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NFTCard } from '@/components/nft/nft-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface ProfileContentProps {
  user: {
    id: string;
    name: string;
    bio?: string;
    email?: string;
    avatar_url?: string;
    banner_url?: string;
    wallet_address?: string;
    created_at: string;
    nfts: Array<{
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
    purchases: Array<{
      id: string;
      amount: number;
      created_at: string;
      status: string;
      nft: {
        id: string;
        title: string;
        media_url: string;
        price: number;
      };
    }>;
    stats: {
      totalNfts: number;
      totalCreated: number;
      totalVolume: number;
      totalLikes: number;
      totalPurchases: number;
    };
  };
}

export function ProfileContent({ user }: ProfileContentProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name,
    bio: user.bio || '',
  });
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setCurrentUser(profile);
        setIsOwnProfile(authUser.id === user.id);
      }
    };

    getCurrentUser();
  }, [user.id]);

  const handleCopyAddress = () => {
    if (user.wallet_address && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(user.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Wallet address copied!');
    }
  };

  const handleShareProfile = () => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
    
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied!');
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be less than 5MB');
      return;
    }

    try {
      const avatarUrl = await uploadFile(file, 'avatars');
      setAvatarPreview(avatarUrl);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner must be less than 10MB');
      return;
    }

    try {
      const bannerUrl = await uploadFile(file, 'banners');
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
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      // Refresh the page to show updates
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color = 'text-foreground' }: any) => (
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
      <Header />
      
      <main className="container mx-auto px-4">
        {/* Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative h-64 md:h-80 lg:h-96 -mx-4 mb-16"
        >
          <div className="relative h-full rounded-b-2xl overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            {user.banner_url && (
              <Image
                src={user.banner_url}
                alt="Profile banner"
                fill
                className="object-cover"
              />
            )}
            {isOwnProfile && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Edit Banner
              </Button>
            )}
          </div>
          
          {/* Profile Avatar */}
          <div className="absolute -bottom-16 left-8">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-background">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-3xl">
                  <User className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

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

        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">{user.name}</h1>
              {isOwnProfile && (
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit3 className="w-4 h-4 mr-2" />
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
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-bio">Bio</Label>
                        <Textarea
                          id="edit-bio"
                          value={editForm.bio}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleSaveProfile} disabled={isUpdating} className="w-full">
                        {isUpdating ? 'Updating...' : 'Save Changes'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            {user.bio && (
              <p className="text-muted-foreground max-w-2xl">{user.bio}</p>
            )}

            <div className="flex items-center gap-4">
              {user.wallet_address && (
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyAddress}
                    className="p-1 h-6 w-6"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
              <Badge variant="secondary">
                Joined {formatDistance(new Date(user.created_at), new Date(), { addSuffix: true })}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShareProfile}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {currentUser && !isOwnProfile && (
              <>
                <Link href={`/chat/new?user=${user.id}`}>
                  <Button variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </Link>
                <Button>Follow</Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 my-8"
        >
          <StatCard
            icon={Palette}
            label="Created"
            value={user.stats.totalCreated}
            color="text-blue-500"
          />
          <StatCard
            icon={ShoppingBag}
            label="Owned"
            value={user.stats.totalNfts}
            color="text-green-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Volume"
            value={`${user.stats.totalVolume.toFixed(2)} ETH`}
            color="text-purple-500"
          />
          <StatCard
            icon={Heart}
            label="Likes"
            value={user.stats.totalLikes}
            color="text-red-500"
          />
          <StatCard
            icon={ShoppingBag}
            label="Purchased"
            value={user.stats.totalPurchases}
            color="text-orange-500"
          />
        </motion.div>

        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <Tabs defaultValue="owned" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="owned">
                Owned ({user.stats.totalNfts})
              </TabsTrigger>
              <TabsTrigger value="created">
                Created ({user.stats.totalCreated})
              </TabsTrigger>
              <TabsTrigger value="purchased">
                Purchased ({user.stats.totalPurchases})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owned" className="mt-6">
              {user.nfts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {user.nfts.map((nft) => (
                    <NFTCard
                      key={nft.id}
                      {...nft}
                      sale_type={nft.sale_type as 'fixed' | 'auction' | 'bid'}
                      status={nft.status as 'available' | 'sold' | 'auction' | 'draft'}
                      creator={{ id: user.id, name: user.name, avatar_url: user.avatar_url }}
                      owner={{ id: user.id, name: user.name, avatar_url: user.avatar_url }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Palette className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No NFTs owned</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? 'Start collecting NFTs to see them here' : 'This user hasn\'t collected any NFTs yet'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="created" className="mt-6">
              {user.createdNfts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {user.createdNfts.map((nft) => (
                    <NFTCard
                      key={nft.id}
                      {...nft}
                      sale_type={nft.sale_type as 'fixed' | 'auction' | 'bid'}
                      status={nft.status as 'available' | 'sold' | 'auction' | 'draft'}
                      creator={{ id: user.id, name: user.name, avatar_url: user.avatar_url }}
                      owner={{ id: user.id, name: user.name, avatar_url: user.avatar_url }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No NFTs created</h3>
                  <p className="text-muted-foreground mb-4">
                    {isOwnProfile ? 'Create your first NFT to get started' : 'This user hasn\'t created any NFTs yet'}
                  </p>
                  {isOwnProfile && (
                    <Link href="/create">
                      <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Create NFT
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="purchased" className="mt-6">
              {user.purchases.length > 0 ? (
                <div className="space-y-4">
                  {user.purchases.map((purchase) => (
                    <Card key={purchase.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={purchase.nft.media_url}
                              alt={purchase.nft.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <Link 
                              href={`/nft/${purchase.nft.id}`}
                              className="font-medium hover:underline"
                            >
                              {purchase.nft.title}
                            </Link>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Purchased for {purchase.amount} ETH</span>
                              <span>
                                {formatDistance(new Date(purchase.created_at), new Date(), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <Link href={`/nft/${purchase.nft.id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No purchases</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? 'Start collecting NFTs to see your purchases here' : 'This user hasn\'t made any purchases yet'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
'use client';

import Image from 'next/image';
import { Heart, Eye, Clock, View, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserAvatar } from '@/lib/avatar-generator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface NFTPreviewCardProps {
  title?: string;
  description?: string;
  media_url?: string;
  price?: string;
  sale_type?: 'fixed' | 'auction' | 'bid';
  category?: string;
  tags?: string[];
  auction_end_time?: string;
  ar_link?: string;
  creator?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  isPreview?: boolean;
}

export function NFTPreviewCard({
  title = 'Your NFT Title',
  description = 'Add a description for your NFT...',
  media_url,
  price = '0.00',
  sale_type = 'fixed',
  category = 'art',
  tags = [],
  auction_end_time,
  ar_link,
  creator,
  isPreview = true,
}: NFTPreviewCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!auction_end_time || sale_type !== 'auction') return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(auction_end_time).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining('Ended');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [auction_end_time, sale_type]);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const displayPrice = price && parseFloat(price) > 0 ? parseFloat(price).toFixed(3) : '0.000';
  
  // Use default preview image if no media uploaded
  const previewImage = media_url || '/avatars/avt-20.jpg';
  const showUploadPrompt = !media_url;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-card">
      {/* Preview Badge */}
      {isPreview && (
        <div className="absolute -top-2.5 -right-2.5 z-20">
          <Badge className="bg-primary text-primary-foreground shadow-xl border-2 border-background px-2.5 py-1 text-xs font-semibold animate-pulse">
            Live Preview
          </Badge>
        </div>
      )}

      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden">
        <div className="relative w-full h-full group">
          <Image
            src={previewImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Upload Prompt Overlay */}
          {showUploadPrompt && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center text-white">
                <div className="relative inline-block mb-2">
                  <Upload className="w-12 h-12 mx-auto" />
                  <div className="absolute inset-0 blur-xl bg-white/20 -z-10" />
                </div>
                <p className="text-sm font-semibold">Upload your media</p>
                <p className="text-xs opacity-80 mt-1">Image, Video, or Audio</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Overlay Elements */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          {/* Category Badge */}
          {category && (
            <Badge variant="secondary" className="text-xs capitalize font-semibold glass backdrop-blur-md px-2.5 py-1 border-white/20">
              {category}
            </Badge>
          )}

          {/* Like Button */}
          <button
            onClick={handleLike}
            className="glass backdrop-blur-md rounded-full p-2 hover:bg-white/20 transition-all duration-200 border border-white/20"
          >
            <Heart
              className={`w-4 h-4 transition-all duration-200 ${
                isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* AR Badge */}
        {ar_link && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="glass backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1 border border-white/20">
              <View className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold text-white">AR</span>
            </div>
          </div>
        )}

        {/* Auction Timer */}
        {sale_type === 'auction' && timeRemaining && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="glass backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-white/20">
              <Clock className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold text-white">{timeRemaining}</span>
            </div>
          </div>
        )}

        {/* Bottom Stats */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
          <div className="glass backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1 border border-white/20">
            <Eye className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">0</span>
          </div>
          <div className="glass backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1 border border-white/20">
            <Heart className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">0</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3.5">
        {/* Title and Description */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg truncate">
            {title || 'Your NFT Title'}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs px-2.5 py-0.5 rounded-full border-border/50"
              >
                #{tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge 
                variant="outline" 
                className="text-xs px-2.5 py-0.5 rounded-full border-border/50"
              >
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Creator Info */}
        {creator && (
          <div className="flex items-center gap-3 pt-1">
            <Avatar className="w-9 h-9 border-2 border-border/50">
              <AvatarImage src={getUserAvatar(creator.name, creator.avatar_url)} />
              <AvatarFallback className="text-xs font-semibold">
                {creator.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Creator</p>
              <p className="text-sm font-semibold truncate">
                {creator.name}
              </p>
            </div>
          </div>
        )}

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-3.5 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              {sale_type === 'auction' ? 'Starting Bid' : 
               sale_type === 'bid' ? 'Minimum Bid' : 'Price'}
            </p>
            <p className="font-bold text-xl leading-none">{displayPrice} <span className="text-sm text-muted-foreground font-normal">ETH</span></p>
          </div>

          <Button 
            className="btn-primary h-10 px-5 text-sm font-semibold" 
            size="sm" 
            disabled
          >
            {sale_type === 'auction' ? 'Bid' : 
             sale_type === 'bid' ? 'Offer' : 'Buy'}
          </Button>
        </div>
      </div>
    </div>
  );
}
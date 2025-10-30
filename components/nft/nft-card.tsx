'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Eye, Clock, View } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserAvatar } from '@/lib/avatar-generator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface NFTCardProps {
  id: string;
  title: string;
  media_url: string;
  price: number;
  likes: number;
  views: number;
  sale_type: 'fixed' | 'auction' | 'bid';
  auction_end_time?: string | null;
  ar_link?: string | null;
  owner?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  creator?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  status?: 'available' | 'sold' | 'auction' | 'draft';
}

export function NFTCard({
  id,
  title,
  media_url,
  price,
  likes,
  views,
  sale_type,
  auction_end_time,
  ar_link,
  owner,
  creator,
  status = 'available',
}: NFTCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!auction_end_time) return;

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

      setTimeRemaining(`${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [auction_end_time]);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <Link href={`/nft/${id}`}>
      <div className="nft-card group">
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={media_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />

          {status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">SOLD</span>
            </div>
          )}

          {/* AR Link Icon */}
          {ar_link && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(ar_link, '_blank');
              }}
              className="absolute top-3 left-3 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all duration-200 group/ar"
              title="View in AR"
            >
              <View className="w-4 h-4 text-white group-hover/ar:text-blue-400 transition-colors" />
            </button>
          )}

          <button
            onClick={handleLike}
            className="absolute top-3 right-3 like-button"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="glass rounded-full px-3 py-1 flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-semibold">{views}</span>
            </div>
            <div className="glass rounded-full px-3 py-1 flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-semibold">{likes}</span>
            </div>
          </div>

          {sale_type === 'auction' && timeRemaining && (
            <div className="absolute top-3 left-3 countdown-timer flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{timeRemaining}</span>
            </div>
          )}

          {status === 'draft' && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary">Draft</Badge>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 truncate">{title}</h3>

          <div className="flex items-center justify-between mb-3">
            {creator && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={getUserAvatar(creator.name, creator.avatar_url)} />
                  <AvatarFallback className="text-xs">
                    {creator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Creator</p>
                  <p className="text-xs font-medium truncate max-w-[100px]">
                    {creator.name}
                  </p>
                </div>
              </div>
            )}

            {owner && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={getUserAvatar(owner.name, owner.avatar_url)} />
                  <AvatarFallback className="text-xs">
                    {owner.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="text-xs font-medium truncate max-w-[100px]">
                    {owner.name}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {sale_type === 'auction' ? 'Current Bid' : 'Price'}
              </p>
              <p className="font-bold text-lg">{price} KFC</p>
            </div>

            <Button className="btn-primary" size="sm">
              {sale_type === 'auction' ? 'Place Bid' : 'Buy Now'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { Gavel, Loader2, TrendingUp, Users } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  bidder: {
    name: string;
    avatar_url?: string;
  };
}

interface BidComponentProps {
  nftId: string;
  currentPrice: number;
  saleType: 'fixed' | 'auction' | 'bid';
  auctionEndTime?: string | null;
  onBidPlaced?: () => void;
  onPurchase?: () => void;
}

export function BidComponent({ 
  nftId, 
  currentPrice, 
  saleType, 
  auctionEndTime,
  onBidPlaced,
  onPurchase 
}: BidComponentProps) {
  const { user, profile } = useAuthStore();
  const [bidAmount, setBidAmount] = useState('');
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);

  const walletBalance = profile?.wallet_balance || 0;
  const isAuctionEnded = auctionEndTime ? new Date(auctionEndTime) < new Date() : false;
  const highestBid = bids.length > 0 ? bids[0].amount : currentPrice;
  const minimumBid = saleType === 'auction' ? highestBid + 0.001 : currentPrice;

  useEffect(() => {
    fetchBids();
  }, [nftId]);

  const fetchBids = async () => {
    try {
      const response = await fetch(`/api/bids?nft_id=${nftId}`);
      const data = await response.json();
      
      if (response.ok) {
        setBids(data);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
    }
  };

  const handleBid = async () => {
    if (!user) {
      toast.error('Please log in to place a bid');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    if (amount > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    if (saleType === 'auction' && amount <= highestBid) {
      toast.error('Bid must be higher than current highest bid');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nft_id: nftId,
          amount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Bid placed successfully!');
        setBidAmount('');
        setBidDialogOpen(false);
        fetchBids();
        onBidPlaced?.();
      } else {
        toast.error(data.error || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Bid error:', error);
      toast.error('Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }

    if (currentPrice > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setPurchasing(true);

    try {
      const response = await fetch('/api/nfts/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nft_id: nftId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('NFT purchased successfully!');
        onPurchase?.();
      } else {
        toast.error(data.error || 'Failed to purchase NFT');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase NFT');
    } finally {
      setPurchasing(false);
    }
  };

  if (saleType === 'fixed') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-2xl font-bold">{currentPrice} KFC</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-lg font-semibold">{walletBalance.toFixed(2)} KFC</p>
          </div>
        </div>

        <Button 
          onClick={handlePurchase}
          disabled={purchasing || !user || currentPrice > walletBalance}
          className="w-full btn-primary"
          size="lg"
        >
          {purchasing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Buy Now for ${currentPrice} KFC`
          )}
        </Button>

        {currentPrice > walletBalance && (
          <p className="text-sm text-red-500 text-center">
            Insufficient balance. You need {(currentPrice - walletBalance).toFixed(2)} more KFC.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Bid Info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {saleType === 'auction' ? 'Current Bid' : 'Starting Price'}
          </p>
          <p className="text-2xl font-bold">{highestBid} KFC</p>
          {bids.length > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {bids.length} bid{bids.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p className="text-lg font-semibold">{walletBalance.toFixed(2)} KFC</p>
        </div>
      </div>

      {/* Auction Timer */}
      {saleType === 'auction' && auctionEndTime && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            {isAuctionEnded ? (
              <span className="text-red-500">Auction Ended</span>
            ) : (
              <>
                Ends {formatDistance(new Date(auctionEndTime), new Date(), { addSuffix: true })}
              </>
            )}
          </p>
        </div>
      )}

      {/* Bid Button */}
      {!isAuctionEnded && (
        <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={!user}
              className="w-full btn-primary"
              size="lg"
            >
              <Gavel className="w-4 h-4 mr-2" />
              {saleType === 'auction' ? 'Place Bid' : 'Make Offer'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {saleType === 'auction' ? 'Place Bid' : 'Make Offer'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bid-amount">
                  Amount (KFC)
                </Label>
                <Input
                  id="bid-amount"
                  type="number"
                  step="0.001"
                  placeholder={minimumBid.toString()}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum: {minimumBid} KFC
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setBidDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBid}
                  disabled={loading || !bidAmount || parseFloat(bidAmount) < minimumBid}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Placing...
                    </>
                  ) : (
                    `Bid ${bidAmount || minimumBid} KFC`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bid History */}
      {bids.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Bid History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bids.slice(0, 5).map((bid, index) => (
              <div key={bid.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={bid.bidder.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {bid.bidder.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{bid.bidder.name}</span>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Highest
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{bid.amount} KFC</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(new Date(bid.created_at), new Date(), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
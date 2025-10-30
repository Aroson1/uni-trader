import { useState, useEffect } from "react";
import { Heart, Eye, Share2, MoreVertical, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import nftFantasyFlower from "@/assets/nft-fantasy-flower.jpg";
import nftPinkBall from "@/assets/nft-pink-ball.jpg";
import nftBird from "@/assets/nft-bird.jpg";
import nftCat from "@/assets/nft-cat.jpg";
import nftBear from "@/assets/nft-bear.jpg";
import avatarRalph from "@/assets/avatar-ralph.jpg";
import avatarFreddie from "@/assets/avatar-freddie.jpg";
import avatarMason from "@/assets/avatar-mason.jpg";

// NFT Detail Page Component
export const NFTDetailPage = () => {
  const [liked, setLiked] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 18,
    seconds: 53,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const bidHistory = [
    {
      name: "Mason Woodward",
      avatar: avatarMason,
      time: "8 hours ago",
      amount: "4.89 ETH",
      usd: "≈ $12,246",
    },
    {
      name: "Mason Woodward",
      avatar: avatarMason,
      time: "at 06/10/2021 3:20 AM",
      amount: "4.89 ETH",
      usd: "≈ $12,246",
    },
    {
      name: "Mason Woodward",
      avatar: avatarMason,
      time: "8 hours ago",
      amount: "4.89 ETH",
      usd: "≈ $12,246",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Image */}
          <div className="relative">
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-blue-200/20 to-purple-200/20 backdrop-blur-sm border border-border/50">
              <img
                src={nftFantasyFlower}
                alt="The Fantasy Flower illustration"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                "The Fantasy Flower illustration"
              </h1>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => {}}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-5 w-5" />
                <span className="font-medium">225</span>
              </div>
              <button
                onClick={() => setLiked(!liked)}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart
                  className={`h-5 w-5 ${liked ? "fill-primary text-primary" : ""}`}
                />
                <span className="font-medium">{liked ? 101 : 100}</span>
              </button>
            </div>

            {/* Owner & Creator */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-4 border border-border/30">
                <p className="text-sm text-muted-foreground mb-2">Owned By</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={avatarRalph} />
                    <AvatarFallback>RG</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">Ralph Garraway</span>
                </div>
              </div>

              <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl p-4 border border-border/30">
                <p className="text-sm text-muted-foreground mb-2">Create By</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-accent/20">
                    <AvatarImage src={avatarFreddie} />
                    <AvatarFallback>FC</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">Freddie Carpenter</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              Habitant sollicitudin faucibus cursus lectus pulvinar dolor non ultrices eget.
              Facilisi lobortisal morbi fringilla urna amet sed ipsum vitae ipsum malesuada.
              Habitant sollicitudin faucibus cursus lectus pulvinar dolor non ultrices eget.
              Facilisi lobortisal morbi fringilla urna amet sed ipsum
            </p>

            {/* Bid Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-nft-card rounded-2xl p-5 border border-border/30">
                <p className="text-sm text-muted-foreground mb-1">Current Bid</p>
                <p className="text-2xl font-bold">4.89 ETH</p>
                <p className="text-sm text-muted-foreground">≈ $12,246</p>
              </div>

              <div className="bg-nft-card rounded-2xl p-5 border border-border/30">
                <p className="text-sm text-muted-foreground mb-1">Countdown</p>
                <p className="text-2xl font-bold font-mono">
                  {String(timeLeft.hours).padStart(2, "0")}:
                  {String(timeLeft.minutes).padStart(2, "0")}:
                  {String(timeLeft.seconds).padStart(2, "0")}
                </p>
              </div>
            </div>

            {/* Place Bid Button */}
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <span className="mr-2">🔨</span>
              Place a bid
            </Button>

            {/* Tabs */}
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
                <TabsTrigger value="history">Bid History</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="provenance">Provenance</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4 mt-6">
                {bidHistory.map((bid, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={bid.avatar} />
                        <AvatarFallback>MW</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{bid.name}</p>
                        <p className="text-sm text-muted-foreground">{bid.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{bid.amount}</p>
                      <p className="text-sm text-muted-foreground">{bid.usd}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="info" className="mt-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Contract Address: 0x495f...7b5e</p>
                  <p>Token ID: #123456</p>
                  <p>Token Standard: ERC-721</p>
                  <p>Blockchain: Ethereum</p>
                </div>
              </TabsContent>

              <TabsContent value="provenance" className="mt-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Minted on June 10, 2021</p>
                  <p>Original Creator: Freddie Carpenter</p>
                  <p>First Sale: 2.5 ETH</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

// Live Auctions Grid Component
export const LiveAuctionsGrid = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const auctions = [
    {
      id: 1,
      title: "Hamlet Contemplates ...",
      image: nftPinkBall,
      creator: "SalvadorDali",
      avatar: avatarRalph,
      currentBid: "4.89 ETH",
      likes: 100,
      timeLeft: "05:18:33:05",
      bgColor: "from-pink-100/10 to-pink-200/10",
    },
    {
      id: 2,
      title: "Triumphant Awakenin...",
      image: nftBird,
      creator: "Trista Francis",
      avatar: avatarFreddie,
      currentBid: "4.89 ETH",
      likes: 220,
      timeLeft: "05:18:33:05",
      bgColor: "from-yellow-100/10 to-green-200/10",
    },
    {
      id: 3,
      title: "Living Vase 01 By Lanz...",
      image: nftCat,
      creator: "Freddie Carpenter",
      avatar: avatarMason,
      currentBid: "4.89 ETH",
      likes: 90,
      timeLeft: "05:18:33:05",
      bgColor: "from-blue-100/10 to-blue-200/10",
    },
    {
      id: 4,
      title: "Flame Dress' By Balma...",
      image: nftBear,
      creator: "Tyler Covington",
      avatar: avatarRalph,
      currentBid: "4.89 ETH",
      likes: 145,
      timeLeft: "05:18:33:05",
      bgColor: "from-orange-100/10 to-yellow-200/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-bold">Live Auctions</h2>
          <Button variant="link" className="text-primary font-semibold underline">
            EXPLORE MORE
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {auctions.map((auction) => (
            <div
              key={auction.id}
              className="group relative flex"
              onMouseEnter={() => setHoveredCard(auction.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="bg-nft-card rounded-3xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 flex flex-col w-full hover:-translate-y-1">
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${auction.bgColor} backdrop-blur-sm transition-opacity duration-300`}
                  />
                  <img
                    src={auction.image}
                    alt={auction.title}
                    className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />

                  {/* Overlay on hover */}
                  <div
                    className={`absolute inset-0 bg-nft-overlay/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
                      hoveredCard === auction.id ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <Button
                      size="lg"
                      className="rounded-full px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105"
                    >
                      🔮 Place Bid
                    </Button>
                  </div>

                  {/* Likes Badge */}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200 hover:bg-black/80 hover:scale-110">
                    <Heart className="h-4 w-4 fill-white text-white transition-transform duration-200" />
                    <span className="text-sm font-medium text-white">{auction.likes}</span>
                  </div>

                  {/* Timer Badge */}
                  <div className="absolute bottom-4 left-4 bg-primary/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200">
                    <Clock className="h-4 w-4 text-white animate-pulse" />
                    <span className="text-sm font-medium text-white font-mono">
                      {auction.timeLeft}
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-5 space-y-4 flex-grow flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg line-clamp-1 transition-colors duration-200 group-hover:text-primary">{auction.title}</h3>
                    <Badge className="bg-nft-badge/20 text-primary hover:bg-nft-badge/30 border-primary/20 shrink-0 transition-all duration-200">
                      BSC
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border-2 border-primary/20 transition-all duration-200 group-hover:border-primary/40">
                        <AvatarImage src={auction.avatar} />
                        <AvatarFallback>{auction.creator[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-muted-foreground">Creator</p>
                        <p className="text-sm font-semibold transition-colors duration-200">{auction.creator}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Current Bid</p>
                      <p className="text-sm font-bold transition-colors duration-200 group-hover:text-primary">{auction.currentBid}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

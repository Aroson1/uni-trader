"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NFTCard } from "@/components/nft/nft-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, SortAsc, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  category: string;
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

const categories = [
  "All",
  "Art",
  "Music",
  "Domain Names",
  "Virtual Worlds",
  "Trading Cards",
  "Collectibles",
  "Sports",
  "Utility",
];
const statusFilters = ["Buy Now", "On Auctions", "Has Offers"];
const sortOptions = [
  "Latest",
  "Price: Low to High",
  "Price: High to Low",
  "Most Liked",
  "Most Viewed",
];

const mockNFTs = [
  {
    id: "1",
    title: "Hamlet Contemplates Contemporary Existence",
    media_url:
      "https://images.pexels.com/photos/3109807/pexels-photo-3109807.jpeg",
    price: 4.89,
    likes: 100,
    views: 223,
    sale_type: "auction" as const,
    auction_end_time: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000
    ).toISOString(),
    status: "available" as const,
    creator: {
      id: "1",
      name: "SalvadorDali",
      avatar_url:
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
    },
    owner: {
      id: "1",
      name: "SalvadorDali",
      avatar_url:
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
    },
  },
  {
    id: "2",
    title: "Triumphant Awakening Contemporary Art",
    media_url:
      "https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg",
    price: 4.89,
    likes: 220,
    views: 445,
    sale_type: "auction" as const,
    auction_end_time: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    status: "available" as const,
    creator: {
      id: "2",
      name: "Trista Francis",
      avatar_url:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
    },
    owner: {
      id: "2",
      name: "Trista Francis",
      avatar_url:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
    },
  },
  {
    id: "3",
    title: "Living Vase 01 By Lanza",
    media_url:
      "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg",
    price: 4.89,
    likes: 90,
    views: 312,
    sale_type: "auction" as const,
    auction_end_time: new Date(
      Date.now() + 4 * 24 * 60 * 60 * 1000
    ).toISOString(),
    status: "available" as const,
    creator: {
      id: "3",
      name: "Freddie Carpenter",
      avatar_url:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
    },
    owner: {
      id: "3",
      name: "Freddie Carpenter",
      avatar_url:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
    },
  },
  {
    id: "4",
    title: "Flame Dress By Balmain",
    media_url:
      "https://images.pexels.com/photos/1102772/pexels-photo-1102772.jpeg",
    price: 4.89,
    likes: 143,
    views: 567,
    sale_type: "fixed" as const,
    status: "available" as const,
    creator: {
      id: "4",
      name: "Tyler Covington",
      avatar_url:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
    },
    owner: {
      id: "4",
      name: "Tyler Covington",
      avatar_url:
        "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg",
    },
  },
];

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Latest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    // Get URL params
    const filter = searchParams.get("filter");
    const category = searchParams.get("category");

    if (filter === "auction") {
      setSelectedStatus(["On Auctions"]);
    }
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNFTs(true); // Reset pagination when filters change
  }, [selectedCategory, selectedStatus, searchQuery, sortBy]);

  const fetchNFTs = async (reset = false) => {
    try {
      setLoading(true);
      console.log("Fetching NFTs with filters:", {
        selectedCategory,
        selectedStatus,
        searchQuery,
        sortBy,
        page: reset ? 1 : page,
      });
      const currentPage = reset ? 1 : page;
      const limit = 12;

      let query = supabase
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
          category,
          views,
          ar_link,
          creator:creator_id(id, name, avatar_url),
          owner:owner_id(id, name, avatar_url),
          likes_count:likes(count)
        `
        )
        .in("status", ["active", "available"]);

      console.log("Fetched NFTs:", query);

      // Apply category filter
      if (selectedCategory !== "All") {
        query = query.eq("category", selectedCategory);
      }

      // Apply status filters
      if (selectedStatus.includes("On Auctions")) {
        query = query.eq("sale_type", "auction");
      } else if (selectedStatus.includes("Buy Now")) {
        query = query.eq("sale_type", "fixed");
      }

      // Apply search
      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      // Apply sorting
      switch (sortBy) {
        case "Price: Low to High":
          query = query.order("price", { ascending: true });
          break;
        case "Price: High to Low":
          query = query.order("price", { ascending: false });
          break;
        case "Most Liked":
          query = query.order("likes_count", { ascending: false });
          break;
        case "Most Viewed":
          query = query.order("views", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      // Apply pagination
      const offset = (currentPage - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching NFTs:", error);
        toast.error("Failed to load NFTs");
        return;
      }

      const transformedNFTs = (data || []).map((nft) => ({
        ...nft,
        creator: Array.isArray(nft.creator) ? nft.creator[0] : nft.creator,
        owner: Array.isArray(nft.owner) ? nft.owner[0] : nft.owner,
        likes_count: Array.isArray(nft.likes_count)
          ? nft.likes_count.length
          : 0,
      }));

      if (reset) {
        setNfts(transformedNFTs);
        setPage(2);
      } else {
        setNfts((prev) => [...prev, ...transformedNFTs]);
        setPage((prev) => prev + 1);
      }

      setHasMore(transformedNFTs.length === limit);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      toast.error("Failed to load NFTs");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNFTs(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="hero-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6">Explore NFTs</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover unique digital assets from talented creators around the
            world
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md search-enhanced">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search NFTs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base border-border/50 focus:border-primary/50"
            />
          </div>
        </div>

        {/* Category Chips */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Categories</h3>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`category-chip cursor-pointer px-4 py-2 text-sm font-medium ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-lg border-primary"
                    : "hover:bg-muted/80 border-border/60 hover:border-primary/30"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
                {selectedCategory === category && category !== "All" && (
                  <X
                    className="ml-2 w-3 h-3 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory("All");
                    }}
                  />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="mb-8">
          <div className="filter-section">
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
              {/* Status Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Status:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map((status) => (
                    <Badge
                      key={status}
                      variant={selectedStatus.includes(status) ? "default" : "outline"}
                      className={`status-filter-chip cursor-pointer px-3 py-1 text-xs font-medium ${
                        selectedStatus.includes(status)
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "hover:bg-muted/80 border-border/60 hover:border-primary/30"
                      }`}
                      onClick={() => toggleStatus(status)}
                    >
                      {status}
                      {selectedStatus.includes(status) && (
                        <X
                          className="ml-1 w-3 h-3 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(status);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <SortAsc className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Sort by:</span>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-52 h-10 border-border/60 hover:border-primary/30 focus:border-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option} value={option} className="cursor-pointer">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Header */}
        {!loading && nfts.length > 0 && (
          <div className="mb-6 flex justify-between items-center">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{nfts.length}</span> NFTs found
              {selectedCategory !== "All" && (
                <span> in <span className="font-medium text-foreground">{selectedCategory}</span></span>
              )}
            </p>
            <div className="text-xs text-muted-foreground">
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Results */}
        <main>
          {loading && nfts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-4 animate-pulse border border-border/30">
                    <div className="aspect-square bg-muted/70 rounded-xl mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted/70 rounded w-3/4"></div>
                      <div className="h-3 bg-muted/50 rounded w-1/2"></div>
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-muted/50 rounded w-1/4"></div>
                        <div className="h-6 bg-muted/70 rounded-full w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : nfts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nfts.map((nft) => (
                    <NFTCard
                      key={nft.id}
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
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-12 flex justify-center">
                    <Button
                      variant="outline"
                      className="btn-secondary px-8 py-3 h-12 text-base font-medium border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Loading more NFTs...
                        </>
                      ) : (
                        <>
                          <span>Load More NFTs</span>
                          <div className="ml-3 text-xs bg-muted px-2 py-1 rounded-full">
                            +{Math.min(12, 100 - nfts.length)}
                          </div>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="glass rounded-2xl p-8 max-w-md mx-auto border border-border/30">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No NFTs found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters to find what you're looking for.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedStatus([]);
                      setSearchQuery("");
                    }}
                    className="btn-secondary"
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

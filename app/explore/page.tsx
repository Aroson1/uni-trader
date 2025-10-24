"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NFTCard } from "@/components/nft/nft-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
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
          <div className="breadcrumb">
            <a href="/">Home</a>
            <span className="breadcrumb-separator">/</span>
            <span>Explore</span>
          </div>

          <h1 className="mb-6">Explore 4</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover unique digital assets from talented creators around the
            world
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Status
              </h3>
              <div className="space-y-2">
                {statusFilters.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatus.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Sort By</h3>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="sort"
                      checked={sortBy === option}
                      onChange={() => setSortBy(option)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search NFTs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 input-field"
                />
              </div>
            </div>

            {loading && nfts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                    <div className="aspect-square bg-muted rounded-xl mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : nfts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="btn-secondary"
                      size="lg"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4">
                  No NFTs found
                </p>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

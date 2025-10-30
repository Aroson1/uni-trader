"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NFTPreviewCard } from "@/components/nft/nft-preview-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  X,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Eye,
  Zap,
  Clock,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "art",
  "music",
  "photography",
  "collectibles",
  "sports",
  "gaming",
  "utility",
  "other",
];

const SALE_TYPES = [
  { value: "fixed", label: "Fixed Price", icon: DollarSign },
  { value: "auction", label: "Timed Auction", icon: Clock },
  { value: "bid", label: "Open for Bids", icon: Zap },
];

interface CreateNFTForm {
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: string;
  saleType: "fixed" | "auction" | "bid";
  auctionEndTime: string;
  ar_link: string;
  file: File | null;
}

export default function CreatePage() {
  const {
    user,
    profile,
    loading: authLoading,
    isReady,
  } = useRequireAuth("/create");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState<CreateNFTForm>({
    title: "",
    description: "",
    category: "",
    tags: [],
    price: "",
    saleType: "fixed",
    auctionEndTime: "",
    ar_link: "",
    file: null,
  });

  const [tagInput, setTagInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize user data on mount
  useEffect(() => {
    // Wait for auth to be ready and user to be available
    if (!isReady || !user) return;

    // Use user and profile from auth hook instead of fetching again
    setCurrentUser(
      profile || {
        id: user.id,
        name: user.email?.split("@")[0] || "User",
        email: user.email,
      }
    );
    setIsLoading(false);
  }, [isReady, user, profile]);

  if (isLoading || !supabase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      toast.error("File size must be less than 200MB");
      return;
    }

    // Check file type
    const allowedTypes = ["image/", "video/", "audio/"];
    const isAllowed = allowedTypes.some((type) => file.type.startsWith(type));

    if (!isAllowed) {
      toast.error(
        "File type not supported. Please use images, videos, or audio files."
      );
      return;
    }

    setFormData((prev) => ({ ...prev, file }));

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, file: null }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toLowerCase()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const uploadFileToSupabase = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "media");
    formData.append("folder", "nfts");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error || "Unknown error"}`);
    }

    const data = await response.json();
    return data.url;
  };

  const handleCreateNFT = async () => {
    if (!currentUser) {
      toast.error("Please login to create item");
      return;
    }

    if (
      !formData.file ||
      !formData.title ||
      !formData.category ||
      !formData.price
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.saleType === "auction" && !formData.auctionEndTime) {
      toast.error("Please set auction end time");
      return;
    }

    setIsCreating(true);

    try {
      // Upload file to Supabase Storage
      setIsUploading(true);
      const mediaUrl = await uploadFileToSupabase(formData.file);
      setIsUploading(false);

      // Create Item record
      const nftData = {
        title: formData.title,
        description: formData.description,
        media_url: mediaUrl,
        owner_id: currentUser.id,
        creator_id: currentUser.id,
        price: parseFloat(formData.price),
        status: "available",
        sale_type: formData.saleType,
        category: formData.category,
        tags: formData.tags,
        ar_link: formData.ar_link || null,
        auction_end_time:
          formData.saleType === "auction" ? formData.auctionEndTime : null,
        metadata: {
          fileType: formData.file.type,
          fileSize: formData.file.size,
          originalName: formData.file.name,
        },
      };

      const { data: nft, error } = await supabase
        .from("nfts")
        .insert(nftData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create Item: ${error.message}`);
      }

      toast.success("Item created successfully!");
      router.push(`/nft/${nft.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create item");
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return ImageIcon;
    if (file.type.startsWith("video/")) return Video;
    if (file.type.startsWith("audio/")) return Music;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 lg:mb-12">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-3 mb-3"
              >
                <div className="relative">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <div className="absolute inset-0 blur-xl bg-primary/30 -z-10" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Create New Listing
                </h1>
              </motion.div>
              <p className="text-muted-foreground text-base lg:text-lg max-w-2xl mx-auto">
                Upload your digital asset and set your listing details to start
                selling
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-7">
              {/* Left Side - Live Preview (Sticky) */}
              <div className="order-2 lg:order-1">
                <div className="lg:sticky lg:top-8 h-fit space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-semibold">Live Preview</h3>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Updates in real-time
                    </Badge>
                  </div>

                  <div className="max-w-md mx-auto">
                    <NFTPreviewCard
                      title={formData.title || undefined}
                      description={formData.description || undefined}
                      media_url={previewUrl || undefined}
                      price={formData.price}
                      sale_type={formData.saleType}
                      category={formData.category || undefined}
                      tags={formData.tags}
                      auction_end_time={formData.auctionEndTime || undefined}
                      ar_link={formData.ar_link || undefined}
                      creator={
                        currentUser
                          ? {
                              id: currentUser.id,
                              name:
                                currentUser.name ||
                                currentUser.email?.split("@")[0] ||
                                "You",
                              avatar_url: currentUser.avatar_url,
                            }
                          : undefined
                      }
                      isPreview={true}
                    />
                  </div>

                  <div className="glass rounded-2xl p-6 border border-primary/20 max-w-md mx-auto  bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-bold text-base">Pro Tips</h4>
                    </div>
                    <ul className="space-y-3.5">
                      <li className="flex items-start gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          Use high-quality images{" "}
                          <span className="text-xs opacity-70">
                            (1000x1000px or higher)
                          </span>
                        </p>
                      </li>
                      <li className="flex items-start gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          Write descriptive titles and detailed descriptions
                        </p>
                      </li>
                      <li className="flex items-start gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          Add relevant tags to improve discoverability
                        </p>
                      </li>
                      <li className="flex items-start gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          Set competitive pricing based on market trends
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Side - Form (Scrollable) */}
              <div className="order-1 lg:order-2 space-y-6">
                {/* Upload Section */}
                <Card className="border-border/50 rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2.5 text-lg">
                      <Upload className="w-5 h-5 text-primary" />
                      Upload Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!formData.file ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                      >
                        <div className="relative inline-block mb-4">
                          <Upload className="w-14 h-14 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                          <div className="absolute inset-0 blur-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                        </div>
                        <p className="font-semibold text-base mb-2">
                          Choose file to upload
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          PNG, JPG, GIF, WEBP, MP4, or MP3. Max 200MB.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="pointer-events-none"
                        >
                          Browse Files
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* File Info */}
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border/50">
                          {(() => {
                            const IconComponent = getFileIcon(formData.file);
                            return (
                              <div className="p-2.5 rounded-lg bg-primary/10">
                                <IconComponent className="w-5 h-5 text-primary" />
                              </div>
                            );
                          })()}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {formData.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(formData.file.size)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleRemoveFile}
                            className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </CardContent>
                </Card>

                {/* Item Details */}
                <Card className="border-border/50 rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Item Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="Enter item title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <Label
                        htmlFor="description"
                        className="text-sm font-medium"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your item in detail..."
                        rows={4}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">
                          Category <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              category: value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() +
                                  category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add tag"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === "Enter" &&
                              (e.preventDefault(), handleAddTag())
                            }
                            className="h-11"
                          />
                          <Button
                            variant="outline"
                            onClick={handleAddTag}
                            size="sm"
                            className="h-11 px-4 shrink-0"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                          >
                            {tag}
                            <X
                              className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2.5">
                      <Label htmlFor="ar_link" className="text-sm font-medium">
                        AR Link (Optional)
                      </Label>
                      <Input
                        id="ar_link"
                        type="url"
                        placeholder="https://your-ar-viewer.com/model"
                        value={formData.ar_link}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            ar_link: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Add a link to view this NFT in Augmented Reality
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sale Settings */}
                <Card className="border-border/50 rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Sale Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      value={formData.saleType}
                      onValueChange={(value: any) =>
                        setFormData((prev) => ({ ...prev, saleType: value }))
                      }
                    >
                      <TabsList className="grid w-full grid-cols-3 h-11 p-1">
                        {SALE_TYPES.map((type) => (
                          <TabsTrigger
                            key={type.value}
                            value={type.value}
                            className="flex items-center gap-1.5 text-sm h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                          >
                            <type.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              {type.label}
                            </span>
                            <span className="sm:hidden">
                              {type.label.split(" ")[0]}
                            </span>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      <TabsContent value="fixed" className="mt-5">
                        <div className="space-y-2.5">
                          <Label
                            htmlFor="price"
                            className="text-sm font-medium"
                          >
                            Price (ETH){" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="price"
                              type="number"
                              step="0.001"
                              placeholder="0.00"
                              value={formData.price}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  price: e.target.value,
                                }))
                              }
                              className="h-11 pl-9"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="auction" className="mt-5">
                        <div className="space-y-4">
                          <div className="space-y-2.5">
                            <Label
                              htmlFor="starting-price"
                              className="text-sm font-medium"
                            >
                              Starting Price (ETH){" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="starting-price"
                                type="number"
                                step="0.001"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    price: e.target.value,
                                  }))
                                }
                                className="h-11 pl-9"
                              />
                            </div>
                          </div>
                          <div className="space-y-2.5">
                            <Label
                              htmlFor="end-time"
                              className="text-sm font-medium"
                            >
                              Auction End Time{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="end-time"
                                type="datetime-local"
                                value={formData.auctionEndTime}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    auctionEndTime: e.target.value,
                                  }))
                                }
                                min={new Date().toISOString().slice(0, 16)}
                                className="h-11 pl-9"
                              />
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="bid" className="mt-5">
                        <div className="space-y-2.5">
                          <Label
                            htmlFor="min-bid"
                            className="text-sm font-medium"
                          >
                            Minimum Bid (ETH){" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="min-bid"
                              type="number"
                              step="0.001"
                              placeholder="0.00"
                              value={formData.price}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  price: e.target.value,
                                }))
                              }
                              className="h-11 pl-9"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Create Button */}
                <Card className="border-border/50 rounded-2xl shadow-lg bg-gradient-to-br from-background to-muted/20">
                  <CardContent className="pt-6 pb-6">
                    <Button
                      onClick={handleCreateNFT}
                      disabled={
                        isCreating ||
                        isUploading ||
                        !formData.file ||
                        !formData.title ||
                        !formData.category ||
                        !formData.price
                      }
                      className="w-full h-12 text-base font-semibold relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      {isUploading ? (
                        <>
                          <Upload className="w-5 h-5 mr-2 animate-pulse" />
                          Uploading Media...
                        </>
                      ) : isCreating ? (
                        <>
                          <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                          Creating Listing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Create Listing
                        </>
                      )}
                    </Button>

                    {(!formData.file ||
                      !formData.title ||
                      !formData.category ||
                      !formData.price) && (
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Complete all required fields marked with{" "}
                        <span className="text-destructive">*</span> to create
                        your listing
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

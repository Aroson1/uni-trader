'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'art',
  'music',
  'photography',
  'collectibles',
  'sports',
  'gaming',
  'utility',
  'other'
];

const SALE_TYPES = [
  { value: 'fixed', label: 'Fixed Price', icon: DollarSign },
  { value: 'auction', label: 'Timed Auction', icon: Clock },
  { value: 'bid', label: 'Open for Bids', icon: Zap },
];

interface CreateNFTForm {
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: string;
  saleType: 'fixed' | 'auction' | 'bid';
  auctionEndTime: string;
  file: File | null;
}

export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState<CreateNFTForm>({
    title: '',
    description: '',
    category: '',
    tags: [],
    price: '',
    saleType: 'fixed',
    auctionEndTime: '',
    file: null,
  });
  
  const [tagInput, setTagInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize user data on mount
  useEffect(() => {
    const initUser = async () => {
      // Get current user (middleware ensures user is authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser(profile);
      }
      
      setIsLoading(false);
    };
    
    initUser();
  }, []);

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
      toast.error('File size must be less than 200MB');
      return;
    }

    // Check file type
    const allowedTypes = ['image/', 'video/', 'audio/'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowed) {
      toast.error('File type not supported. Please use images, videos, or audio files.');
      return;
    }

    setFormData(prev => ({ ...prev, file }));
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, file: null }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toLowerCase()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const uploadFileToSupabase = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'media');
    formData.append('folder', 'nfts');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.url;
  };

  const handleCreateNFT = async () => {
    if (!currentUser) {
      toast.error('Please login to create NFT');
      return;
    }

    if (!formData.file || !formData.title || !formData.category || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.saleType === 'auction' && !formData.auctionEndTime) {
      toast.error('Please set auction end time');
      return;
    }

    setIsCreating(true);

    try {
      // Upload file to Supabase Storage
      setIsUploading(true);
      const mediaUrl = await uploadFileToSupabase(formData.file);
      setIsUploading(false);

      // Create NFT record
      const nftData = {
        title: formData.title,
        description: formData.description,
        media_url: mediaUrl,
        owner_id: currentUser.id,
        creator_id: currentUser.id,
        price: parseFloat(formData.price),
        status: 'available',
        sale_type: formData.saleType,
        category: formData.category,
        tags: formData.tags,
        auction_end_time: formData.saleType === 'auction' ? formData.auctionEndTime : null,
        metadata: {
          fileType: formData.file.type,
          fileSize: formData.file.size,
          originalName: formData.file.name,
        },
      };

      const { data: nft, error } = await supabase
        .from('nfts')
        .insert(nftData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create NFT: ${error.message}`);
      }

      toast.success('NFT created successfully!');
      router.push(`/nft/${nft.id}`);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to create NFT');
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type.startsWith('video/')) return Video;
    if (file.type.startsWith('audio/')) return Music;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Create New NFT</h1>
              <p className="text-muted-foreground text-lg">
                Upload your digital asset and create your NFT on UniTrader
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload File
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!formData.file ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">Choose file to upload</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        PNG, JPG, GIF, WEBP, MP4, or MP3. Max 200MB.
                      </p>
                      <Button variant="outline">Browse Files</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* File Preview */}
                      <div className="relative rounded-lg overflow-hidden bg-muted aspect-square">
                        {formData.file.type.startsWith('image/') && previewUrl && (
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        )}
                        {formData.file.type.startsWith('video/') && previewUrl && (
                          <video
                            src={previewUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        )}
                        {formData.file.type.startsWith('audio/') && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                              <p className="font-medium">{formData.file.name}</p>
                            </div>
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveFile}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* File Info */}
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        {(() => {
                          const IconComponent = getFileIcon(formData.file);
                          return <IconComponent className="w-5 h-5 text-muted-foreground" />;
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{formData.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(formData.file.size)}
                          </p>
                        </div>
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

              {/* Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle>NFT Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter NFT title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your NFT"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <Button variant="outline" onClick={handleAddTag}>
                        Add
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-destructive"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sale Settings */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Sale Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs 
                  value={formData.saleType} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, saleType: value }))}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    {SALE_TYPES.map((type) => (
                      <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="fixed" className="mt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price (ETH) *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.001"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="auction" className="mt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="starting-price">Starting Price (ETH) *</Label>
                          <Input
                            id="starting-price"
                            type="number"
                            step="0.001"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-time">Auction End Time *</Label>
                          <Input
                            id="end-time"
                            type="datetime-local"
                            value={formData.auctionEndTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, auctionEndTime: e.target.value }))}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="bid" className="mt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="min-bid">Minimum Bid (ETH) *</Label>
                        <Input
                          id="min-bid"
                          type="number"
                          step="0.001"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Preview & Create */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      {previewUrl ? (
                        formData.file?.type.startsWith('image/') ? (
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            width={300}
                            height={300}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <Music className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Media preview</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No file selected</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">{formData.title || 'Untitled NFT'}</h3>
                      <p className="text-muted-foreground">{formData.description || 'No description'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formData.category || 'No category'}</Badge>
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="text-2xl font-bold">
                        {formData.price ? `${formData.price} ETH` : '0.00 ETH'}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {formData.saleType} sale
                      </p>
                    </div>

                    <Button
                      onClick={handleCreateNFT}
                      disabled={isCreating || isUploading || !formData.file || !formData.title}
                      className="w-full"
                      size="lg"
                    >
                      {isUploading ? 'Uploading...' : isCreating ? 'Creating NFT...' : 'Create NFT'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
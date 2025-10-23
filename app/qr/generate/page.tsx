'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  QrCode,
  Download,
  Copy,
  Check,
  Package,
  Clock,
  User,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface Order {
  id: string;
  price: number;
  status: string;
  created_at: string;
  verification_code: string;
  buyer: {
    id: string;
    name: string;
  };
  seller: {
    id: string;
    name: string;
  };
  nft: {
    id: string;
    title: string;
    media_url: string;
  };
}

interface QRPayload {
  orderId: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  verificationCode: string;
  timestamp: number;
  nonce: string;
}

export default function QRGeneratePage() {
  const { user, profile, loading: authLoading, isReady } = useRequireAuth('/qr/generate');
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Wait for auth to be ready and user to be available
    if (!isReady || !user) return;

    // Use user and profile from auth hook instead of fetching again
    setCurrentUser(profile || {
      id: user.id,
      name: user.email?.split('@')[0] || 'User',
      email: user.email
    });
    loadOrders(user.id);
  }, [isReady, user, profile]);

  const loadOrders = async (userId: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          status,
          created_at,
          verification_code,
          buyer:profiles!orders_buyer_id_fkey(id, name),
          seller:profiles!orders_seller_id_fkey(id, name),
          nft:nfts(id, title, media_url)
        `)
        .eq('seller_id', userId)
        .eq('status', 'awaiting_verification')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersData = (data || []).map(order => ({
        ...order,
        buyer: Array.isArray(order.buyer) ? order.buyer[0] : order.buyer,
        seller: Array.isArray(order.seller) ? order.seller[0] : order.seller,
        nft: Array.isArray(order.nft) ? order.nft[0] : order.nft,
      }));

      setOrders(ordersData as Order[]);
      
    } catch (error: any) {
      toast.error('Failed to load orders');
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      setSelectedOrder(order || null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, orders]);

  const generateQRCode = async () => {
    if (!selectedOrder || !currentUser) {
      toast.error('Please select an order');
      return;
    }

    setGenerating(true);

    try {
      // Create verification URL with verification code
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      const verificationUrl = `${baseUrl}/verify?code=${selectedOrder.verification_code}&order=${selectedOrder.id}`;

      // Generate QR code
      const qrImageDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      setQrData(verificationUrl);
      setQrImageUrl(qrImageDataUrl);

      // Update QR record in database
      const { error } = await supabase
        .from('orders')
        .update({
          qr_code: verificationUrl,
        })
        .eq('id', selectedOrder.id);

      if (error) {
        console.error('Failed to save QR record:', error);
        // Don't throw error as QR is already generated
      }

      toast.success('QR code generated successfully!');
      
    } catch (error: any) {
      toast.error('Failed to generate QR code');
      console.error('Error generating QR code:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrImageUrl) return;

    if (typeof document === 'undefined') return;
    
    const link = document.createElement('a');
    link.download = `unitrader-qr-${selectedOrder?.id.slice(0, 8)}.png`;
    link.href = qrImageUrl;
    link.click();
  };

  const copyQRData = () => {
    if (!qrData) return;

    if (typeof navigator === 'undefined') return;

    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('QR data copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading orders...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
              <h1 className="text-4xl font-bold mb-4">Pending Order Verifications</h1>
              <p className="text-muted-foreground text-lg">
                Generate QR codes for buyers to verify their purchases and complete payment to you
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Select Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Completed Orders</Label>
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an order to generate QR code" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.nft.title}</span>
                              <span className="text-muted-foreground">
                                - {order.price} KFC
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedOrder && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold">Order Details</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Order ID</span>
                          <span className="font-mono text-sm">
                            #{selectedOrder.id.slice(0, 8)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">NFT</span>
                          <span className="font-medium text-sm">{selectedOrder.nft.title}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Amount</span>
                          <span className="font-medium text-sm">{selectedOrder.price} KFC</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Buyer</span>
                          <span className="font-medium text-sm">{selectedOrder.buyer.name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Seller</span>
                          <span className="font-medium text-sm">{selectedOrder.seller.name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Date</span>
                          <span className="font-medium text-sm">
                            {formatDistance(new Date(selectedOrder.created_at), new Date(), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant="default">{selectedOrder.status}</Badge>
                        </div>
                      </div>

                      <Button 
                        onClick={generateQRCode} 
                        disabled={generating}
                        className="w-full"
                      >
                        {generating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-2" />
                            Generate QR Code
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {orders.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No completed orders</h3>
                      <p className="text-muted-foreground">
                        You need completed orders to generate QR codes
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Generated QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qrImageUrl ? (
                    <div className="space-y-4">
                      {/* QR Code Image */}
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-lg shadow-sm">
                          <img 
                            src={qrImageUrl} 
                            alt="QR Code" 
                            className="w-64 h-64"
                          />
                        </div>
                      </div>

                      {/* QR Info */}
                      <div className="space-y-3">
                        <h3 className="font-semibold">QR Code Information</h3>
                        
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-mono break-all">{qrData}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Order</span>
                            <span>{selectedOrder?.nft.title}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Generated</span>
                            <span>Just now</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant="default">Active</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <Separator />
                      
                      <div className="flex gap-2">
                        <Button onClick={downloadQR} className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Download PNG
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={copyQRData}
                          className="flex-1"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          {copied ? 'Copied!' : 'Copy URL'}
                        </Button>
                      </div>

                      {/* Usage Instructions */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                        <h4 className="font-medium mb-2">How to use this QR code:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Share this QR code with the other party</li>
                          <li>• They can scan it to verify order details</li>
                          <li>• Use it during item transfer/pickup</li>
                          <li>• Verification ensures authenticity</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No QR code generated</h3>
                      <p className="text-muted-foreground">
                        Select an order and click generate to create a QR code
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent QR Codes */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Recent QR Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-16 h-16 mx-auto mb-4" />
                  <p>Your recent QR codes will appear here</p>
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
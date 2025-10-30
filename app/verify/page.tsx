'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  Package,
  User,
  DollarSign,
  Clock,
  Shield,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

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

interface VerificationResult {
  isValid: boolean;
  order?: {
    id: string;
    price: number;
    status: string;
    created_at: string;
    verification_code: string;
    buyer: {
      id: string;
      name: string;
      avatar_url?: string;
    };
    seller: {
      id: string;
      name: string;
      avatar_url?: string;
    };
    nft: {
      id: string;
      title: string;
      media_url: string;
    };
  };
  error?: string;
  scannedAt: string;
  qrRecord?: {
    id: string;
    status: string;
    generated_at: string;
  };
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    const payloadParam = searchParams.get('payload');
    const codeParam = searchParams.get('code');
    const orderParam = searchParams.get('order');
    
    if (payloadParam) {
      verifyQRCode(payloadParam);
    } else if (codeParam && orderParam) {
      verifyWithCode(codeParam, orderParam);
    } else {
      setLoading(false);
      setVerificationResult({
        isValid: false,
        error: 'No QR code or verification code provided',
        scannedAt: new Date().toISOString(),
      });
    }
  }, [searchParams]);

  const verifyWithCode = async (verificationCode: string, orderId: string) => {
    setLoading(true);

    try {
      // Get order details with the verification code
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          status,
          created_at,
          buyer_id,
          seller_id,
          verification_code,
          buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
          seller:profiles!orders_seller_id_fkey(id, name, avatar_url),
          nft:nfts(id, title, media_url)
        `)
        .eq('verification_code', verificationCode)
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error('Order not found or verification code invalid');
      }

      setVerificationResult({
        isValid: true,
        order: {
          ...orderData,
          buyer: Array.isArray(orderData.buyer) ? orderData.buyer[0] : orderData.buyer,
          seller: Array.isArray(orderData.seller) ? orderData.seller[0] : orderData.seller,
          nft: Array.isArray(orderData.nft) ? orderData.nft[0] : orderData.nft,
        },
        scannedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationResult({
        isValid: false,
        error: error.message || 'Failed to verify order',
        scannedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyQRCode = async (payloadString: string) => {
    setLoading(true);

    try {
      // Decode payload
      const decodedPayload = JSON.parse(atob(payloadString));
      setPayload(decodedPayload);

      // Validate payload structure
      if (!decodedPayload.orderId || !decodedPayload.productId || !decodedPayload.timestamp) {
        throw new Error('Invalid QR code format');
      }

      // Check timestamp (valid for 24 hours)
      const now = Date.now();
      const qrAge = now - decodedPayload.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (qrAge > maxAge) {
        throw new Error('QR code has expired');
      }

      // Get order details with the verification code
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          status,
          created_at,
          buyer_id,
          seller_id,
          verification_code,
          buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
          seller:profiles!orders_seller_id_fkey(id, name, avatar_url),
          nft:nfts(id, title, media_url)
        `)
        .eq('verification_code', decodedPayload.verificationCode)
        .single();

      if (orderError || !orderData) {
        throw new Error('Order not found');
      }

      // Validate order details match payload
      if (
        orderData.buyer_id !== decodedPayload.buyerId ||
        orderData.seller_id !== decodedPayload.sellerId ||
        Math.abs(orderData.price - decodedPayload.price) > 0.0001 // Allow small floating point differences
      ) {
        throw new Error('Order details do not match QR code');
      }

      // Check if QR record exists
      const { data: qrRecord } = await supabase
        .from('qr_records')
        .select('*')
        .eq('order_id', decodedPayload.orderId)
        .eq('payload_hash', payloadString)
        .single();

      // Log the scan
      const scanData = {
        scanned_at: new Date().toISOString(),
        scanned_by_ip: 'client-ip', // In production, get actual IP
        status: 'scanned',
      };

      if (qrRecord) {
        await supabase
          .from('qr_records')
          .update(scanData)
          .eq('id', qrRecord.id);
      }

      setVerificationResult({
        isValid: true,
        order: {
          ...orderData,
          buyer: Array.isArray(orderData.buyer) ? orderData.buyer[0] : orderData.buyer,
          seller: Array.isArray(orderData.seller) ? orderData.seller[0] : orderData.seller,
          nft: Array.isArray(orderData.nft) ? orderData.nft[0] : orderData.nft,
        },
        scannedAt: new Date().toISOString(),
        qrRecord: qrRecord || undefined,
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationResult({
        isValid: false,
        error: error.message || 'Failed to verify QR code',
        scannedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const markTransferComplete = async () => {
    if (!verificationResult?.order || !verificationResult.order.verification_code) return;

    setMarkingComplete(true);

    try {
      // Use the verification function to complete the payment
      const { data, error } = await supabase.rpc('verify_order_payment', {
        p_verification_code: verificationResult.order.verification_code
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast.success('Payment completed successfully! Seller has been paid.');
          
          // Update verification result to show completed status
          setVerificationResult(prev => prev ? {
            ...prev,
            order: prev.order ? { ...prev.order, status: 'completed' } : prev.order,
            qrRecord: prev.qrRecord ? { ...prev.qrRecord, status: 'verified' } : undefined
          } : null);
        } else {
          throw new Error(result.message || 'Verification failed');
        }
      } else {
        throw new Error('No response from verification function');
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to complete payment');
      console.error('Error completing payment:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Verifying QR code...</p>
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
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">QR Code Verification</h1>
              <p className="text-muted-foreground text-lg">
                Verify the authenticity of your Item order
              </p>
            </div>

            {/* Verification Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {verificationResult?.isValid ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Verification Successful
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-500" />
                      Verification Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {verificationResult?.isValid ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">This QR code is authentic and valid</span>
                    </div>
                    
                    <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                        Verification Details
                      </h4>
                      <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <li>• Order details verified against database</li>
                        <li>• QR code timestamp is valid</li>
                        <li>• Buyer and seller information confirmed</li>
                        <li>• Item ownership verified</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">
                        {verificationResult?.error || 'Unknown verification error'}
                      </span>
                    </div>
                    
                    <div className="p-4 bg-red-50 dark:bg-red-950/50 rounded-lg">
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                        Security Warning
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This QR code could not be verified. Do not proceed with any transaction 
                        or transfer based on this code. Contact support if you believe this is an error.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details (if valid) */}
            {verificationResult?.isValid && verificationResult.order && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">Item Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Title</span>
                          <span className="font-medium">{verificationResult.order.nft.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID</span>
                          <span className="font-mono text-sm">
                            {verificationResult.order.nft.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Transaction</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">{verificationResult.order.price} KFC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="default">{verificationResult.order.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">Buyer</h4>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{verificationResult.order.buyer.name}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Seller</h4>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{verificationResult.order.seller.name}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Date</span>
                      <span>
                        {formatDistance(
                          new Date(verificationResult.order.created_at), 
                          new Date(), 
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified At</span>
                      <span>
                        {formatDistance(
                          new Date(verificationResult.scannedAt), 
                          new Date(), 
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                    {verificationResult.qrRecord && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">QR Status</span>
                        <Badge variant={
                          verificationResult.qrRecord.status === 'verified' ? 'default' : 'secondary'
                        }>
                          {verificationResult.qrRecord.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {verificationResult?.isValid && verificationResult.order && (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    If you are the buyer and have received the Item, click the button below to 
                    complete the payment to the seller.
                  </p>
                  
                  <Button 
                    onClick={markTransferComplete}
                    disabled={markingComplete || verificationResult.order?.status === 'completed'}
                    className="w-full"
                  >
                    {markingComplete ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : verificationResult.order?.status === 'completed' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Payment Already Completed
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Complete Payment to Seller
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Back to App */}
            <div className="text-center mt-8">
              <Button variant="outline" onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}>
                Back to UniTrader
              </Button>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
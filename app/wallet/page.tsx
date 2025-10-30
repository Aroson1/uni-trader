"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { useRequireAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { WalletTopUp } from '@/components/wallet/wallet-top-up';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Unlink,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  CreditCard,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";

interface Transaction {
  id: string;
  type: "deposit" | "purchase" | "sale" | "bid";
  amount: number;
  description: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  nftTitle?: string;
  hash?: string;
}

interface Payment {
  id: string;
  amount: number;
  kfc_amount: number;
  status: string;
  created_at: string;
}

export default function WalletPage() {
  const { user, profile, loading: authLoading, isReady } = useRequireAuth('/wallet');
  const { fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const walletBalance = profile?.wallet_balance || 0;
  const KFC_TO_INR_RATE = 1.2; // 1 KFC = 1.2 INR
  const portfolioValue = walletBalance * KFC_TO_INR_RATE;

  useEffect(() => {
    // Wait for auth to be ready and user to be available
    if (!isReady || !user) return;
    
    loadWalletData();
  }, [isReady, user]);

  const loadWalletData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Fetch payments history
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData);
      }

      // Fetch transaction history (orders, bids)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          nft:nfts(title)
        `
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const { data: bidsData, error: bidsError } = await supabase
        .from("bids")
        .select(
          `
          *,
          nft:nfts(title)
        `
        )
        .eq("bidder_id", user.id)
        .order("created_at", { ascending: false });

      // Combine and format transactions
      const allTransactions: Transaction[] = [];

      // Add payment deposits
      if (paymentsData) {
        paymentsData.forEach((payment) => {
          if (payment.status === "completed") {
            allTransactions.push({
              id: `payment-${payment.id}`,
              type: "deposit",
              amount: payment.kfc_amount,
              description: `KFC purchase via Stripe`,
              timestamp: payment.created_at,
              status: "completed",
            });
          }
        });
      }

      // Add orders
      if (ordersData) {
        ordersData.forEach((order) => {
          allTransactions.push({
            id: `order-${order.id}`,
            type: order.buyer_id === user.id ? "purchase" : "sale",
            amount: order.price,
            description: order.buyer_id === user.id ? 'Item Purchase' : 'Item Sale',
            timestamp: order.created_at,
            status: order.status,
            nftTitle: order.nft?.title,
          });
        });
      }

      // Add bids
      if (bidsData) {
        bidsData.forEach((bid) => {
          allTransactions.push({
            id: `bid-${bid.id}`,
            type: "bid",
            amount: bid.amount,
            description: "Bid placed",
            timestamp: bid.created_at,
            status:
              bid.status === "accepted"
                ? "completed"
                : bid.status === "active"
                ? "pending"
                : "failed",
            nftTitle: bid.nft?.title,
          });
        });
      }

      // Sort by timestamp
      allTransactions.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error loading wallet data:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    await loadWalletData();
    setRefreshing(false);
    toast.success("Wallet refreshed");
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case "purchase":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "sale":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "bid":
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      default:
        return <ArrowUpRight className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Show loading while auth is initializing or wallet data is loading
  if (!isReady || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>{!isReady ? 'Checking authentication...' : 'Loading wallet data...'}</p>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Wallet</h1>
              <p className="text-muted-foreground">
                Manage your KFC balance and transaction history
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <WalletTopUp onSuccess={() => handleRefresh()} />
            </div>
          </div>

          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  KFC Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {walletBalance.toFixed(2)} KFC
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Available for trading
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Portfolio Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${portfolioValue.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  At ₹{KFC_TO_INR_RATE}/KFC
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Total Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  All time activity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">
                Transaction History
              </TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        No transactions yet
                      </p>
                      <p className="text-muted-foreground">
                        Your transaction history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(transaction.type)}
                            <div>
                              <p className="font-medium">
                                {transaction.description}
                              </p>
                              {transaction.nftTitle && (
                                <p className="text-sm text-muted-foreground">
                                  {transaction.nftTitle}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatDistance(
                                  new Date(transaction.timestamp),
                                  new Date(),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p
                                className={`font-medium ${
                                  transaction.type === "deposit" ||
                                  transaction.type === "sale"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {transaction.type === "deposit" ||
                                transaction.type === "sale"
                                  ? "+"
                                  : "-"}
                                {transaction.amount} KFC
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹
                                {(transaction.amount * KFC_TO_INR_RATE).toFixed(
                                  2
                                )}
                              </p>
                            </div>
                            {getStatusIcon(transaction.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        No payments yet
                      </p>
                      <p className="text-muted-foreground mb-4">
                        Add KFC to your wallet to start trading
                      </p>
                      <WalletTopUp onSuccess={() => handleRefresh()} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="font-medium">KFC Purchase</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistance(
                                  new Date(payment.created_at),
                                  new Date(),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p className="font-medium text-green-600">
                                +{payment.kfc_amount} KFC
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ${payment.amount.toFixed(2)} USD
                              </p>
                            </div>
                            <Badge
                              variant={
                                payment.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

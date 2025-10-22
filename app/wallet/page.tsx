'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface WalletConnection {
  id: string;
  address: string;
  type: 'primary' | 'secondary';
  balance: number;
  connectedAt: string;
  isVerified: boolean;
}

interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'mint' | 'purchase' | 'sale';
  amount: number;
  address: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  nftTitle?: string;
  hash?: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletConnection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [totalBalance, setTotalBalance] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
      loadWalletData(user.id);
    };
    
    checkUser();
  }, [router]);

  const loadWalletData = async (userId: string) => {
    setLoading(true);
    
    try {
      // Mock wallet connections (in real app, this would come from your database)
      const mockWallets: WalletConnection[] = [
        {
          id: '1',
          address: '0x742d35Cc6A0532De5f0B1cb1d1dDf4F2',
          type: 'primary',
          balance: 2.34,
          connectedAt: '2024-01-15T10:00:00Z',
          isVerified: true,
        },
        {
          id: '2',
          address: '0x8ba1f109551bD432803012645Hac136c',
          type: 'secondary',
          balance: 0.87,
          connectedAt: '2024-02-01T14:30:00Z',
          isVerified: false,
        },
      ];

      // Mock transactions
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'purchase',
          amount: 0.25,
          address: '0x742d35Cc6A0532De5f0B1cb1d1dDf4F2',
          timestamp: '2024-10-20T15:30:00Z',
          status: 'completed',
          nftTitle: 'Digital Art #001',
          hash: '0xabc123...',
        },
        {
          id: '2',
          type: 'received',
          amount: 1.5,
          address: '0x8ba1f109551bD432803012645Hac136c',
          timestamp: '2024-10-19T09:15:00Z',
          status: 'completed',
          hash: '0xdef456...',
        },
        {
          id: '3',
          type: 'sale',
          amount: 0.8,
          address: '0x742d35Cc6A0532De5f0B1cb1d1dDf4F2',
          timestamp: '2024-10-18T11:45:00Z',
          status: 'completed',
          nftTitle: 'Abstract Collection #5',
          hash: '0x789xyz...',
        },
        {
          id: '4',
          type: 'mint',
          amount: 0.02,
          address: '0x742d35Cc6A0532De5f0B1cb1d1dDf4F2',
          timestamp: '2024-10-17T16:20:00Z',
          status: 'pending',
          nftTitle: 'New Creation #12',
        },
      ];

      setWallets(mockWallets);
      setTransactions(mockTransactions);
      
      const total = mockWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
      setTotalBalance(total);
      setPortfolioValue(total * 2400); // Mock ETH price
      
    } catch (error) {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!newWalletAddress) {
      toast.error('Please enter a wallet address');
      return;
    }

    // Basic address validation
    if (!newWalletAddress.startsWith('0x') || newWalletAddress.length !== 42) {
      toast.error('Invalid wallet address format');
      return;
    }

    setIsConnecting(true);

    try {
      // In a real app, you would:
      // 1. Create a challenge message
      // 2. Request user to sign the message
      // 3. Verify the signature
      // 4. Store the verified wallet address
      
      // Mock successful connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newWallet: WalletConnection = {
        id: Date.now().toString(),
        address: newWalletAddress,
        type: 'secondary',
        balance: 0,
        connectedAt: new Date().toISOString(),
        isVerified: false,
      };

      setWallets(prev => [...prev, newWallet]);
      setNewWalletAddress('');
      
      toast.success('Wallet connected successfully!');
      
    } catch (error) {
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = async (walletId: string) => {
    try {
      setWallets(prev => prev.filter(w => w.id !== walletId));
      toast.success('Wallet disconnected');
    } catch (error) {
      toast.error('Failed to disconnect wallet');
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'received':
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'purchase':
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      case 'sale':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'mint':
        return <Plus className="w-4 h-4 text-purple-500" />;
      default:
        return <ArrowUpRight className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading wallet data...</p>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Wallet Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your connected wallets and view transaction history
              </p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect New Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wallet-address">Wallet Address</Label>
                    <Input
                      id="wallet-address"
                      placeholder="0x..."
                      value={newWalletAddress}
                      onChange={(e) => setNewWalletAddress(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleConnectWallet} 
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBalance.toFixed(4)} ETH</div>
                <p className="text-xs text-muted-foreground">
                  ≈ ${portfolioValue.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{wallets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {wallets.filter(w => w.isVerified).length} verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">24h Change</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+5.2%</div>
                <p className="text-xs text-muted-foreground">
                  +$120.45
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Connected Wallets */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Wallets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <Wallet className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </p>
                          <Badge variant={wallet.type === 'primary' ? 'default' : 'secondary'}>
                            {wallet.type}
                          </Badge>
                          {wallet.isVerified && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {wallet.balance.toFixed(4)} ETH
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyAddress(wallet.address)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnectWallet(wallet.id)}
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {wallets.length === 0 && (
                  <div className="text-center py-8">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No wallets connected</h3>
                    <p className="text-muted-foreground">
                      Connect your first wallet to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {getTransactionIcon(tx.type)}
                          {getStatusIcon(tx.status)}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {tx.type} {tx.nftTitle && `- ${tx.nftTitle}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistance(new Date(tx.timestamp), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-medium ${
                          tx.type === 'received' || tx.type === 'sale' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {tx.type === 'received' || tx.type === 'sale' ? '+' : '-'}
                          {tx.amount} ETH
                        </p>
                        {tx.hash && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-0 h-4"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {transactions.length === 0 && (
                    <div className="text-center py-8">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No transactions</h3>
                      <p className="text-muted-foreground">
                        Your transaction history will appear here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Portfolio Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="nfts">NFT Holdings</TabsTrigger>
                  <TabsTrigger value="activity">Trading Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Balance Distribution</h3>
                      {wallets.map((wallet, index) => (
                        <div key={wallet.id} className="flex items-center justify-between">
                          <span className="text-sm">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </span>
                          <span className="font-medium">
                            {((wallet.balance / totalBalance) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold">Quick Stats</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Spent</span>
                          <span className="font-medium">1.25 ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Earned</span>
                          <span className="font-medium">2.8 ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Net Profit</span>
                          <span className="font-medium text-green-600">+1.55 ETH</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="nfts" className="mt-6">
                  <div className="text-center py-8">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      NFT portfolio analysis coming soon
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                  <div className="text-center py-8">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Detailed trading analytics coming soon
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
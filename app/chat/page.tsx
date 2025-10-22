'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Search, 
  Plus, 
  User,
  Clock,
  Circle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  created_at: string;
  otherUser: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  lastMessage?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unreadCount: number;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      loadConversations(user.id);
    };
    
    checkUser();
  }, [router]);

  const loadConversations = async (userId: string) => {
    setLoading(true);
    
    try {
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participant1_id,
          participant2_id,
          last_message_at,
          created_at
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get other participants' info and last messages
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const otherUserId = conv.participant1_id === userId 
            ? conv.participant2_id 
            : conv.participant1_id;

          // Get other user's profile
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', otherUserId)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_id', otherUserId)
            .eq('read', false);

          return {
            ...conv,
            otherUser: otherUser || { id: otherUserId, name: 'Unknown User' },
            lastMessage: lastMessage || undefined,
            unreadCount: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
      
    } catch (error: any) {
      toast.error('Failed to load conversations');
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <MessageCircle className="w-8 h-8 animate-pulse mx-auto mb-4" />
            <p>Loading conversations...</p>
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
              <h1 className="text-4xl font-bold mb-2">Messages</h1>
              <p className="text-muted-foreground">
                Chat with buyers and sellers
              </p>
            </div>
            
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Conversations List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Conversations ({filteredConversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredConversations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => (
                      <Link
                        key={conversation.id}
                        href={`/chat/${conversation.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={conversation.otherUser.avatar_url} />
                              <AvatarFallback>
                                <User className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            {conversation.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium truncate">
                                {conversation.otherUser.name}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistance(
                                    new Date(conversation.last_message_at),
                                    new Date(),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </div>
                            </div>
                            
                            {conversation.lastMessage ? (
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.lastMessage.sender_id === currentUser?.id ? 'You: ' : ''}
                                {conversation.lastMessage.content}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Start a conversation...
                              </p>
                            )}
                          </div>
                          
                          {conversation.unreadCount > 0 && (
                            <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No conversations found</h3>
                    <p className="text-muted-foreground">
                      Try searching with a different name
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start conversations by messaging sellers on NFT detail pages
                    </p>
                    <Link href="/explore">
                      <Button>
                        <Eye className="w-4 h-4 mr-2" />
                        Explore NFTs
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Link href="/explore">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Eye className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Browse NFTs</p>
                        <p className="text-sm text-muted-foreground">Find items to chat about</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/profile">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <User className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="font-medium">My Profile</p>
                        <p className="text-sm text-muted-foreground">View your activity</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/create">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Plus className="w-8 h-8 text-purple-500" />
                      <div>
                        <p className="font-medium">Create NFT</p>
                        <p className="text-sm text-muted-foreground">List your items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  ArrowLeft,
  Send,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  avatar_url?: string;
  wallet_address?: string;
}

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('user');
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!currentProfile) {
          toast.error('Profile not found');
          router.push('/');
          return;
        }
        
        setCurrentUser(currentProfile);

        // Get target user if specified
        if (targetUserId) {
          if (targetUserId === user.id) {
            toast.error('Cannot start a conversation with yourself');
            router.push('/chat');
            return;
          }

          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();
          
          if (!targetProfile) {
            toast.error('User not found');
            router.push('/chat');
            return;
          }
          
          setTargetUser(targetProfile);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        toast.error('Failed to load chat');
        router.push('/chat');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [router, targetUserId]);

  const handleStartConversation = async () => {
    if (!targetUser || !currentUser || !message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);

    try {
      // Create or get existing conversation
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: targetUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const { conversation_id } = await response.json();

      // Send the first message
      const messageResponse = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id,
          recipient_id: targetUser.id,
          content: message.trim(),
        }),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to send message');
      }

      toast.success('Conversation started successfully!');
      router.push(`/chat/${conversation_id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setSending(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGoBack}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Start New Conversation</h1>
                <p className="text-muted-foreground">
                  Send a message to start chatting
                </p>
              </div>
            </div>

            {/* Chat Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <CardTitle>
                    {targetUser ? `Message ${targetUser.name}` : 'New Message'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target User Info */}
                {targetUser && (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={targetUser.avatar_url} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{targetUser.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {targetUser.wallet_address ? 
                          `${targetUser.wallet_address.slice(0, 6)}...${targetUser.wallet_address.slice(-4)}` :
                          'NFT Trader'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Message</label>
                  <Textarea
                    placeholder={`Hi${targetUser ? ` ${targetUser.name}` : ''}! I'm interested in your NFT...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length}/500 characters
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleGoBack}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartConversation}
                    disabled={!message.trim() || sending}
                    className="flex-1"
                  >
                    {sending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </div>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Start Conversation
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">💡 Chat Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be respectful and professional</li>
                <li>• Ask specific questions about the NFT</li>
                <li>• Negotiate prices fairly</li>
                <li>• Use clear communication</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
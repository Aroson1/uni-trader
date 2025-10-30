"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Search,
  Plus,
  User,
  Clock,
  Circle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";
import { getAnonymousDisplayName } from "@/lib/anonymous-chat";

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
  const {
    user,
    profile,
    loading: authLoading,
    isReady,
  } = useRequireAuth("/chat");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Wait for auth to be ready and user to be available
    if (!isReady || !user) return;

    // Use the user from auth hook instead of fetching again
    setCurrentUser(profile);
    loadConversations(user.id);
  }, [isReady, user, profile]);

  const loadConversations = async (userId: string) => {
    setLoading(true);

    try {
      const { data: conversationsData, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          participant1_id,
          participant2_id,
          last_message_at,
          created_at
        `
        )
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Get other participants' info and last messages
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const otherUserId =
            conv.participant1_id === userId
              ? conv.participant2_id
              : conv.participant1_id;

          // Get other user's profile
          const { data: otherUser } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .eq("id", otherUserId)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content, sender_id, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("sender_id", otherUserId)
            .eq("read", false);

          return {
            ...conv,
            otherUser: otherUser || { id: otherUserId, name: "Unknown User" },
            lastMessage: lastMessage || undefined,
            unreadCount: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error: any) {
      toast.error("Failed to load conversations");
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const displayName = getAnonymousDisplayName(
      conv.otherUser,
      currentUser?.id
    );
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="h-10 w-48 bg-muted rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-64 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            </div>

            {/* Search Skeleton */}
            <div className="h-12 bg-muted rounded-xl animate-pulse" />

            {/* Conversations Skeleton */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Loading message */}
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              </motion.div>
              <p className="text-muted-foreground text-lg font-medium">Loading your conversations...</p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-8 max-w-6xl pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              Messages
            </h1>
            <p className="text-muted-foreground text-lg">
              Chat with buyers and sellers
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chat List */}
            <div className="lg:col-span-2">
              {/* Search */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="relative mb-6"
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                />
              </motion.div>

              {/* Conversations List */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-xl overflow-hidden backdrop-blur-sm bg-card/80">
                  <CardHeader className="border-b bg-gradient-to-r from-violet-50/50 to-pink-50/50 dark:from-violet-950/30 dark:to-pink-950/30">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-violet-600" />
                      Active Conversations
                      <Badge variant="secondary" className="ml-auto">
                        {filteredConversations.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredConversations.length > 0 ? (
                      <div className="divide-y">
                        {filteredConversations.map((conversation, index) => (
                          <motion.div
                            key={conversation.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link
                              href={`/chat/${conversation.id}`}
                              className="block"
                            >
                              <div className="flex items-center gap-4 p-5 hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-pink-50/50 dark:hover:from-violet-950/30 dark:hover:to-pink-950/30 transition-all group">
                                <div className="relative">
                                  <Avatar className="h-14 w-14 border-2 border-violet-200 dark:border-violet-800 group-hover:border-violet-400 transition-colors">
                                    <AvatarImage
                                      src={conversation.otherUser.avatar_url}
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                                      <User className="h-7 w-7" />
                                    </AvatarFallback>
                                  </Avatar>
                                  {conversation.unreadCount > 0 && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg"
                                    >
                                      {conversation.unreadCount > 9
                                        ? "9+"
                                        : conversation.unreadCount}
                                    </motion.div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-lg truncate group-hover:text-violet-600 transition-colors">
                                      {getAnonymousDisplayName(
                                        conversation.otherUser,
                                        currentUser?.id
                                      )}
                                    </h3>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDistance(
                                        new Date(conversation.last_message_at),
                                        new Date(),
                                        { addSuffix: true }
                                      )}
                                    </span>
                                  </div>

                                  {conversation.lastMessage ? (
                                    <p className="text-sm text-muted-foreground truncate">
                                      <span className="font-medium">
                                        {conversation.lastMessage.sender_id ===
                                        currentUser?.id
                                          ? "You: "
                                          : ""}
                                      </span>
                                      {conversation.lastMessage.content}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                      Start a conversation...
                                    </p>
                                  )}
                                </div>

                                {conversation.unreadCount > 0 && (
                                  <Circle className="w-3 h-3 fill-violet-500 text-violet-500" />
                                )}
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="text-center py-16 px-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 flex items-center justify-center">
                            <Search className="w-10 h-10 text-violet-600" />
                          </div>
                        </motion.div>
                        <h3 className="text-xl font-semibold mb-2">
                          No conversations found
                        </h3>
                        <p className="text-muted-foreground">
                          Try searching with a different name
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-16 px-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 flex items-center justify-center">
                            <MessageCircle className="w-10 h-10 text-violet-600" />
                          </div>
                        </motion.div>
                        <h3 className="text-xl font-semibold mb-2">
                          No conversations yet
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Start conversations by messaging sellers on NFT detail
                          pages
                        </p>
                        <Link href="/explore">
                          <Button className="btn-primary">
                            <Eye className="w-4 h-4 mr-2" />
                            Explore NFTs
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar - Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-xl backdrop-blur-sm bg-card/80">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/explore">
                    <div className="p-4 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold group-hover:text-violet-600 transition-colors">Browse NFTs</p>
                          <p className="text-xs text-muted-foreground">
                            Find items to chat about
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href={`/profile/${user?.id}`}>
                    <div className="p-4 mt-2 rounded-xl border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-950/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold group-hover:text-green-600 transition-colors">My Profile</p>
                          <p className="text-xs text-muted-foreground">
                            View your activity
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/create">
                    <div className="p-4 mt-2 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold group-hover:text-purple-600 transition-colors">Create NFT</p>
                          <p className="text-xs text-muted-foreground">
                            List your items
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

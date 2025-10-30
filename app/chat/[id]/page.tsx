"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/avatar-generator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, User, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";
import { getAnonymousDisplayName } from "@/lib/anonymous-chat";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  moderating?: boolean; // Temporary flag for messages being moderated
}

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
}

interface ChatConversationProps {
  params: {
    id: string;
  };
}

export default function ChatConversationPage({
  params,
}: ChatConversationProps) {
  const { user, profile, loading: authLoading, isReady } = useRequireAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [usingPolling, setUsingPolling] = useState(true); // Always use polling
  const [moderating, setModerating] = useState(false);
  const moderationToastRef = useRef<string | number | null>(null);

  useEffect(() => {
    // Wait for auth to be ready and user to be available
    if (!isReady || !user) return;

    const initChat = async () => {
      // Use profile from auth hook or create fallback
      const userProfile = profile || {
        id: user.id,
        name: user.email?.split("@")[0] || "User",
        avatar_url: null,
      };

      setCurrentUser(userProfile);
      loadConversationData(user.id, params.id);
    };

    initChat();
  }, [isReady, user, profile, params.id]);

  useEffect(() => {
    // Only scroll to bottom on initial load
    if (messages.length > 0 && isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setIsInitialLoad(false);
    }
  }, [messages, isInitialLoad]);

  const loadConversationData = async (
    userId: string,
    conversationId: string
  ) => {
    setLoading(true);

    try {
      // Load conversation details
      const { data: conversationData, error: convError } = await supabase
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
        .eq("id", conversationId)
        .single();

      if (convError) throw convError;

      // Check if user is participant
      if (
        conversationData.participant1_id !== userId &&
        conversationData.participant2_id !== userId
      ) {
        router.push("/chat");
        return;
      }

      const otherUserId =
        conversationData.participant1_id === userId
          ? conversationData.participant2_id
          : conversationData.participant1_id;

      // Get other user's profile
      const { data: otherUser } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", otherUserId)
        .single();

      setConversation({
        ...conversationData,
        otherUser: otherUser || { id: otherUserId, name: "Unknown User" },
      });

      // Load messages
      const { data: messagesData, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      setMessages(messagesData || []);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .eq("sender_id", otherUserId)
        .eq("read", false);

      // Use polling mode instead of realtime for better reliability
      console.log("🔄 Chat configured to use polling mode for message updates");
      setUsingPolling(true);
    } catch (error: any) {
      toast.error("Failed to load conversation");
      console.error("Error loading conversation:", error);
      router.push("/chat");
    } finally {
      setLoading(false);
    }
  };

  // Cleanup effect - no longer needed for realtime channels
  useEffect(() => {
    return () => {
      // Cleanup handled by polling useEffect
      console.log("Chat component unmounting");
    };
  }, []);

  // Polling fallback when real-time fails
  useEffect(() => {
    if (!usingPolling || !conversation?.id || !currentUser?.id) return;

    console.log("🔄 Starting polling mode for chat");
    
    const pollForNewMessages = async () => {
      try {
        const { data: newMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .gt('created_at', messages[messages.length - 1]?.created_at || new Date(0).toISOString())
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (newMessages && newMessages.length > 0) {
          console.log('📨 Polling found new messages:', newMessages.length);
          
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
            
            if (uniqueNewMessages.length > 0) {
              // Mark messages as read if they're not from current user
              uniqueNewMessages.forEach(message => {
                if (message.sender_id !== currentUser.id) {
                  supabase
                    .from('messages')
                    .update({ read: true })
                    .eq('id', message.id)
                    .then(({ error }) => {
                      if (error) console.error('Error marking message as read:', error);
                    });
                }
              });
              
              return [...prev, ...uniqueNewMessages];
            }
            
            return prev;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 2 seconds for optimal performance
    const pollingInterval = setInterval(pollForNewMessages, 2000);

    return () => {
      console.log("🛑 Stopping polling mode");
      clearInterval(pollingInterval);
    };
  }, [usingPolling, conversation?.id, currentUser?.id, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversation || !currentUser) return;

    setSending(true);
    setModerating(true);

    try {
      console.log("🔍 [CHAT] Starting message moderation...");
      
      // Optimistically add the message to UI with "moderating" status
      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
        read: false,
        created_at: new Date().toISOString(),
        moderating: true, // Flag to show it's being checked
      };

      const messageToSend = newMessage.trim();
      setNewMessage("");
      setMessages((prev) => [...prev, tempMessage]);

      // First, moderate the message
      const moderationResponse = await fetch("/api/chat/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
          conversation_id: conversation.id,
        }),
      });

      console.log(
        "🔍 [CHAT] Moderation response status:",
        moderationResponse.status
      );

      if (!moderationResponse.ok) {
        console.error(
          "❌ [CHAT] Moderation service error:",
          moderationResponse.status
        );
        // Remove temp message and show error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
        toast.error("Failed to check message");
        setModerating(false);
        setSending(false);
        throw new Error("Moderation service error");
      }

      const moderationResult = await moderationResponse.json();
      console.log("🔍 [CHAT] Moderation result:", moderationResult);
      
      // Moderation complete
      setModerating(false);

      // Handle moderation results
      if (!moderationResult.allowed) {
        console.log("🚫 [CHAT] Message blocked by moderation");
        // Remove temp message
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
        
        // Message is blocked
        if (moderationResult.action === "STOP") {
          toast.error(`Message blocked: ${moderationResult.reason}`);
        } else if (moderationResult.action === "WARN") {
          toast.error(
            `Message blocked: ${moderationResult.reason} (${moderationResult.warnings}/3 warnings)`
          );
        } else if (moderationResult.action === "BANNED") {
          toast.error(
            `You have been banned from the platform: ${moderationResult.reason}`
          );
          // Redirect to home page or show ban message
          router.push("/");
        } else {
          toast.error(`Message blocked: ${moderationResult.reason}`);
        }
        setSending(false);
        return;
      }

      // Show warning if applicable
      if (moderationResult.action === "WARN") {
        console.log("⚠️ [CHAT] Message warned by moderation");
        toast.warning(
          `Warning: ${moderationResult.reason} (${moderationResult.warnings}/3 warnings)`
        );
      } else {
        console.log("✅ [CHAT] Message allowed by moderation");
      }

      // Message is allowed, update the temp message to remove moderating flag
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id ? { ...msg, moderating: false } : msg
        )
      );

      // Send message via API
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
          content: messageToSend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      // Remove the temporary message (polling will fetch the real one)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    } catch (error: any) {
      // Remove the temporary message on error
      setMessages((prev) => prev.filter((msg) => msg.id.startsWith("temp-")));
      toast.error("Failed to send message");
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
      setModerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* <Header /> */}
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Loading conversation...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-background">
        {/* <Header /> */}
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Conversation not found</p>
            <Link href="/chat">
              <Button className="mt-4">Back to Messages</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Chat Header */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <Link href="/chat">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getUserAvatar(conversation.otherUser.name, conversation.otherUser.avatar_url)} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">
                        {getAnonymousDisplayName(
                          conversation.otherUser,
                          currentUser?.id
                        )}
                      </h2>
                      {/* Connection Status Indicator */}
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Polling Mode
                      </Badge>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Messages */}
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === currentUser?.id;
                    const isModeratingMessage = message.moderating;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        {isModeratingMessage ? (
                          // Show moderation indicator inline
                          <div className="max-w-xs lg:max-w-md bg-blue-500/90 text-white rounded-lg p-3 relative overflow-hidden">
                            <div className="relative z-10">
                              <p className="text-sm">{message.content}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-blue-100">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-3 h-3 border-2 border-blue-100 border-t-transparent rounded-full"
                                />
                                <span>Checking content...</span>
                              </div>
                            </div>
                            {/* Animated shimmer effect */}
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                        ) : (
                          <div
                            className={`max-w-xs lg:max-w-md ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            } rounded-lg p-3`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatDistance(
                                new Date(message.created_at),
                                new Date(),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Message Input */}
            <Card>
              <CardContent className="p-4">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 relative">
                    {moderating ? (
                      <SkeletonTheme 
                        baseColor="#f3f4f6" 
                        highlightColor="#e5e7eb"
                        borderRadius="0.5rem"
                      >
                        <Skeleton 
                          height={40} 
                          className="rounded-lg"
                        />
                      </SkeletonTheme>
                    ) : (
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full"
                        disabled={sending}
                      />
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending || moderating}
                    size="sm"
                  >
                    {moderating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

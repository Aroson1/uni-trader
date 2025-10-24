"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
    // Scroll to bottom on initial load or when receiving new messages
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Always scroll on initial load
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setIsInitialLoad(false);
      } else if (currentUser) {
        // Only scroll when receiving new messages AND user is near bottom
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.sender_id !== currentUser.id) {
          // Check if user is near the bottom of the chat
          const chatContainer = messagesEndRef.current?.parentElement;
          if (chatContainer) {
            const isNearBottom =
              chatContainer.scrollTop + chatContainer.clientHeight >=
              chatContainer.scrollHeight - 100; // 100px threshold

            if (isNearBottom) {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          }
        }
      }
    }
  }, [messages, currentUser, isInitialLoad]);

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

      // Set up realtime subscription
      const channel = supabase
        .channel(`conversation-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log("Real-time message received:", payload);

            // Avoid duplicate messages (in case optimistic update already added it)
            setMessages((prev) => {
              const messageExists = prev.some(
                (msg) => msg.id === payload.new.id
              );
              if (messageExists) {
                return prev; // Don't add duplicate
              }
              return [...prev, payload.new as Message];
            });

            // Mark as read if it's not from current user
            if (payload.new.sender_id !== userId) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", payload.new.id);
            }
          }
        )
        .subscribe((status) => {
          console.log("Real-time subscription status:", status);
        });

      setRealtimeChannel(channel);
    } catch (error: any) {
      toast.error("Failed to load conversation");
      console.error("Error loading conversation:", error);
      router.push("/chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        console.log("Cleaning up real-time channel");
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [realtimeChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversation || !currentUser) return;

    setSending(true);

    try {
      console.log("🔍 [CHAT] Starting message moderation...");

      // First, moderate the message
      const moderationResponse = await fetch("/api/chat/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: newMessage.trim(),
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
        throw new Error("Moderation service error");
      }

      const moderationResult = await moderationResponse.json();
      console.log("🔍 [CHAT] Moderation result:", moderationResult);

      // Handle moderation results
      if (!moderationResult.allowed) {
        console.log("🚫 [CHAT] Message blocked by moderation");
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

      // Show warning if applicable (this shouldn't happen with new logic, but keeping for safety)
      if (moderationResult.action === "WARN") {
        console.log("⚠️ [CHAT] Message warned by moderation");
        toast.warning(
          `Warning: ${moderationResult.reason} (${moderationResult.warnings}/3 warnings)`
        );
      } else {
        console.log("✅ [CHAT] Message allowed by moderation");
      }

      // Message is allowed, proceed with sending
      const messageToSend = newMessage.trim();
      setNewMessage("");

      // Optimistic update - add message immediately to UI
      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        content: messageToSend,
        read: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);

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

      // Remove the temporary message (real-time will add the real one)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    } catch (error: any) {
      // Remove the temporary message on error
      setMessages((prev) => prev.filter((msg) => msg.id.startsWith("temp-")));
      toast.error("Failed to send message");
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
        <Header />
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
      <Header />

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
                    <AvatarImage src={conversation.otherUser.avatar_url} />
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

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
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
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sending}
                  />

                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
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

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
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
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);
      loadConversationData(user.id, params.id);
    };

    checkUser();
  }, [router, params.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            setMessages((prev) => [...prev, payload.new as Message]);

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
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);

      setNewMessage("");
    } catch (error: any) {
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
                        {conversation.otherUser.name}
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

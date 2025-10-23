import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Verify user is part of the conversation
    const { data: conversation, error: convError } = await supabaseServer
      .from("conversations")
      .select("participant1_id, participant2_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (
      conversation.participant1_id !== user.id &&
      conversation.participant2_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Not authorized to view this conversation" },
        { status: 403 }
      );
    }

    // Fetch messages
    const { data: messages, error } = await supabaseServer
      .from("messages")
      .select(
        `
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Messages fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Mark messages as read for the current user
    const otherParticipantId =
      conversation.participant1_id === user.id
        ? conversation.participant2_id
        : conversation.participant1_id;

    await supabaseServer
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_id", otherParticipantId)
      .eq("read", false);

    return NextResponse.json({
      messages: (messages || []).reverse(), // Reverse to show oldest first
    });
  } catch (error: any) {
    console.error("Messages API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const messageData = await request.json();

    // Validate required fields
    const required = ["conversation_id", "content"];
    for (const field of required) {
      if (!messageData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Verify conversation exists and user is part of it
    const { data: conversation, error: convError } = await supabaseServer
      .from("conversations")
      .select("participant1_id, participant2_id")
      .eq("id", messageData.conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (
      conversation.participant1_id !== user.id &&
      conversation.participant2_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Not authorized to send messages in this conversation" },
        { status: 403 }
      );
    }

    // Get the other participant
    const otherParticipantId =
      conversation.participant1_id === user.id
        ? conversation.participant2_id
        : conversation.participant1_id;

    // Create message
    const { data: message, error } = await supabaseServer
      .from("messages")
      .insert({
        conversation_id: messageData.conversation_id,
        sender_id: user.id,
        content: messageData.content,
        message_type: "text",
      })
      .select(
        `
        *,
        sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Message creation error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Update conversation last message
    await supabaseServer
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq("id", messageData.conversation_id);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("Message creation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

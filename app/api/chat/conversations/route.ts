import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch user's conversations
    const { data: conversations, error } = await supabaseServer
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(id, name, avatar_url),
        participant2:profiles!conversations_participant2_id_fkey(id, name, avatar_url),
        last_message:messages(content, created_at, sender_id)
      `)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Conversations fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Transform conversations to show the other participant
    const transformedConversations = (conversations || []).map(conv => {
      const otherParticipant = conv.participant1_id === user.id 
        ? conv.participant2 
        : conv.participant1;

      return {
        ...conv,
        other_participant: Array.isArray(otherParticipant) ? otherParticipant[0] : otherParticipant,
        last_message: Array.isArray(conv.last_message) ? conv.last_message[0] : conv.last_message,
      };
    });

    return NextResponse.json({
      conversations: transformedConversations,
    });

  } catch (error: any) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { participant_id } = await request.json();

    if (!participant_id) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    if (participant_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabaseServer
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${participant_id}),and(participant1_id.eq.${participant_id},participant2_id.eq.${user.id})`)
      .single();

    if (existingConv) {
      return NextResponse.json(
        { conversation_id: existingConv.id },
        { status: 200 }
      );
    }

    // Create new conversation
    const { data: conversation, error } = await supabaseServer
      .from('conversations')
      .insert({
        participant1_id: user.id,
        participant2_id: participant_id,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Conversation creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      conversation_id: conversation.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Conversation creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
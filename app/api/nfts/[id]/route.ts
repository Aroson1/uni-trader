import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: nft, error } = await supabase
      .from('nfts')
      .select(`
        *,
        creator:creator_id(id, name, avatar_url, wallet_address),
        owner:owner_id(id, name, avatar_url, wallet_address),
        likes_count:likes(count),
        views
      `)
      .eq('id', params.id)
      .single();

    if (error || !nft) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase
      .from('nfts')
      .update({ views: (nft.views || 0) + 1 })
      .eq('id', params.id);

    return NextResponse.json({ nft });

  } catch (error: any) {
    console.error('NFT fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseServer = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user owns the NFT
    const { data: nft, error: nftError } = await supabase
      .from('nfts')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (nftError || !nft) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    if (nft.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this NFT' },
        { status: 403 }
      );
    }

    const updateData = await request.json();

    // Update NFT
    const { data: updatedNft, error: updateError } = await supabase
      .from('nfts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select(`
        *,
        creator:creator_id(id, name, avatar_url),
        owner:owner_id(id, name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('NFT update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update NFT' },
        { status: 500 }
      );
    }

    return NextResponse.json({ nft: updatedNft });

  } catch (error: any) {
    console.error('NFT update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseServer = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user owns the NFT
    const { data: nft, error: nftError } = await supabase
      .from('nfts')
      .select('owner_id, creator_id')
      .eq('id', params.id)
      .single();

    if (nftError || !nft) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    if (nft.owner_id !== user.id && nft.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this NFT' },
        { status: 403 }
      );
    }

    // Soft delete by updating status
    const { error: deleteError } = await supabase
      .from('nfts')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString() 
      })
      .eq('id', params.id);

    if (deleteError) {
      console.error('NFT delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete NFT' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'NFT deleted successfully' });

  } catch (error: any) {
    console.error('NFT delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
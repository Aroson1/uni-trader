import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { nft_id, amount } = await request.json();
    
    const supabase = createServerSupabaseClient({ throwOnCookieWrite: false });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!nft_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get user's current wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has sufficient balance
    if (profile.wallet_balance < amount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    // Check if Item exists and user is not the creator/owner
    const { data: nft, error: nftError } = await supabase
      .from('nfts')
      .select('creator_id, owner_id, status, sale_type, auction_end_time')
      .eq('id', nft_id)
      .single();

    if (nftError || !nft) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (nft.creator_id === user.id || nft.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot bid on your own Item' }, { status: 400 });
    }

    if (nft.status !== 'active' && nft.status !== 'available') {
      return NextResponse.json({ error: 'Item is not available for bidding' }, { status: 400 });
    }

    // For auctions, check if auction has ended
    if (nft.sale_type === 'auction' && nft.auction_end_time && new Date(nft.auction_end_time) < new Date()) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // For auctions, check if bid is higher than current highest bid
    if (nft.sale_type === 'auction') {
      const { data: highestBid } = await supabase
        .from('bids')
        .select('amount')
        .eq('nft_id', nft_id)
        .eq('status', 'active')
        .order('amount', { ascending: false })
        .limit(1)
        .single();

      if (highestBid && amount <= highestBid.amount) {
        return NextResponse.json({ error: 'Bid must be higher than current highest bid' }, { status: 400 });
      }
    }

    // Mark previous bids as outbid (for auctions)
    if (nft.sale_type === 'auction') {
      await supabase
        .from('bids')
        .update({ status: 'outbid' })
        .eq('nft_id', nft_id)
        .eq('status', 'active');
    }

    // Place the bid
    const { data: newBid, error: bidError } = await supabase
      .from('bids')
      .insert({
        nft_id,
        bidder_id: user.id,
        amount,
        status: 'active'
      })
      .select()
      .single();

    if (bidError) {
      return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 });
    }

    return NextResponse.json(newBid);
  } catch (error) {
    console.error('Bid placement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nft_id = searchParams.get('nft_id');
    
    if (!nft_id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient({ throwOnCookieWrite: false });
    
    // Get all active bids for the Item
    const { data: bids, error } = await supabase
      .from('bids')
      .select(`
        *,
        bidder:profiles!bidder_id(name, avatar_url)
      `)
      .eq('nft_id', nft_id)
      .eq('status', 'active')
      .order('amount', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 });
    }

    return NextResponse.json(bids);
  } catch (error) {
    console.error('Bid fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
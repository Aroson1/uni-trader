import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { nft_id } = await request.json();
    
    const supabase = createServerSupabaseClient({ throwOnCookieWrite: false });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!nft_id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Get Item details
    const { data: nft, error: nftError } = await supabase
      .from('nfts')
      .select('*')
      .eq('id', nft_id)
      .single();

    if (nftError || !nft) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if Item is available for purchase
    if (nft.status !== 'active' && nft.status !== 'available') {
      return NextResponse.json({ error: 'Item is not available for purchase' }, { status: 400 });
    }

    // Check if sale type is fixed price
    if (nft.sale_type !== 'fixed') {
      return NextResponse.json({ error: 'Item is not available for direct purchase' }, { status: 400 });
    }

    // Check if user is not the creator/owner
    if (nft.creator_id === user.id || nft.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot purchase your own Item' }, { status: 400 });
    }

    // Get buyer's wallet balance
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (buyerError || !buyerProfile) {
      return NextResponse.json({ error: 'Buyer profile not found' }, { status: 404 });
    }

    // Check if buyer has sufficient balance
    if (buyerProfile.wallet_balance < nft.price) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    // Get seller's current balance
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', nft.owner_id)
      .single();

    if (sellerError || !sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    // Use a transaction to ensure atomicity
    const { data, error: transactionError } = await supabase.rpc('complete_nft_transaction', {
      p_nft_id: nft_id,
      p_buyer_id: user.id,
      p_amount: nft.price
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

    // Get the created order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        nft:nfts(*),
        buyer:profiles!buyer_id(name, avatar_url),
        seller:profiles!seller_id(name, avatar_url)
      `)
      .eq('nft_id', nft_id)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Item purchased successfully',
      order 
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
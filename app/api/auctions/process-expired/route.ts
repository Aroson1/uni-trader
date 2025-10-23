import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from an authorized source (cron job, admin, etc.)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // Find expired auctions that are still active
    const { data: expiredAuctions, error: fetchError } = await supabase
      .from('nfts')
      .select(`
        id,
        title,
        price,
        owner_id,
        creator_id
      `)
      .eq('sale_type', 'auction')
      .eq('status', 'active')
      .lt('auction_end_time', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired auctions:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!expiredAuctions || expiredAuctions.length === 0) {
      return NextResponse.json({ 
        message: 'No expired auctions found',
        processed: 0 
      });
    }

    const results = [];

    for (const auction of expiredAuctions) {
      try {
        // Find the highest bid for this auction
        const { data: highestBid, error: bidError } = await supabase
          .from('bids')
          .select('bidder_id, amount')
          .eq('nft_id', auction.id)
          .eq('status', 'active')
          .order('amount', { ascending: false })
          .limit(1)
          .single();

        if (bidError && bidError.code !== 'PGRST116') { // PGRST116 is "no rows" error
          console.error(`Error fetching bids for auction ${auction.id}:`, bidError);
          results.push({
            nftId: auction.id,
            status: 'error',
            error: bidError.message
          });
          continue;
        }

        if (!highestBid) {
          // No bids, mark auction as cancelled
          const { error: updateError } = await supabase
            .from('nfts')
            .update({ status: 'cancelled' })
            .eq('id', auction.id);

          if (updateError) {
            console.error(`Error cancelling auction ${auction.id}:`, updateError);
            results.push({
              nftId: auction.id,
              status: 'error',
              error: updateError.message
            });
          } else {
            results.push({
              nftId: auction.id,
              status: 'cancelled',
              reason: 'No bids received'
            });
          }
          continue;
        }

        // Complete the transaction using the database function
        const { error: transactionError } = await supabase.rpc('complete_nft_transaction', {
          p_nft_id: auction.id,
          p_buyer_id: highestBid.bidder_id,
          p_amount: highestBid.amount
        });

        if (transactionError) {
          console.error(`Error completing transaction for auction ${auction.id}:`, transactionError);
          results.push({
            nftId: auction.id,
            status: 'error',
            error: transactionError.message
          });
        } else {
          results.push({
            nftId: auction.id,
            status: 'completed',
            winnerId: highestBid.bidder_id,
            finalPrice: highestBid.amount
          });
        }

      } catch (error: any) {
        console.error(`Unexpected error processing auction ${auction.id}:`, error);
        results.push({
          nftId: auction.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${expiredAuctions.length} expired auctions`,
      processed: expiredAuctions.length,
      results
    });

  } catch (error: any) {
    console.error('Auction processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Optional: Add GET method for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Auction processor endpoint',
    usage: 'POST to process expired auctions'
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Payment processing unavailable' }, { status: 503 });
    }

    const { paymentIntentId } = await request.json();
    
    // Get authenticated user
    const supabase = createServerSupabaseClient({ throwOnCookieWrite: false });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 });
    }

    // Retrieve the payment intent from Stripe to verify it's succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Get the payment record from our database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (payment.status === 'completed') {
      return NextResponse.json({ message: 'Payment already processed' });
    }

    // Update payment status to completed
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
    }

    // Credit KFC to user's wallet
    const { error: walletError } = await supabase.rpc('update_wallet_balance', {
      user_id: user.id,
      amount_to_add: payment.kfc_amount
    });

    if (walletError) {
      console.error('Wallet update error:', walletError);
      return NextResponse.json({ error: 'Wallet update failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and wallet updated',
      kfcAmount: payment.kfc_amount
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
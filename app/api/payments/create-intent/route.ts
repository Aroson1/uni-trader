import { NextRequest, NextResponse } from 'next/server';
import { getStripe, KFC_TO_INR_RATE } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Payment processing unavailable' }, { status: 503 });
    }

    const { amount } = await request.json(); // Amount in KFC
    
    // Get authenticated user
    const supabase = createServerSupabaseClient({ throwOnCookieWrite: false });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Convert KFC to INR paise for Stripe (1 INR = 100 paise)
    const inrAmount = Math.round(amount * KFC_TO_INR_RATE * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: inrAmount,
      currency: 'inr',
      metadata: {
        user_id: user.id,
        kfc_amount: amount.toString(),
        kfc_price_inr: KFC_TO_INR_RATE.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment in database as pending
    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: inrAmount / 100, // Store in rupees
        kfc_amount: amount,
        kfc_price_inr: KFC_TO_INR_RATE,
        status: 'pending', // Mark as pending until confirmed
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { payload } = await request.json();

    if (!payload) {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      );
    }

    // Decode payload
    let decodedPayload;
    try {
      decodedPayload = JSON.parse(atob(payload));
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    // Validate payload structure
    if (!decodedPayload.orderId || !decodedPayload.productId || !decodedPayload.timestamp) {
      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      );
    }

    // Check timestamp (valid for 24 hours)
    const now = Date.now();
    const qrAge = now - decodedPayload.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (qrAge > maxAge) {
      return NextResponse.json(
        { error: 'QR code has expired' },
        { status: 400 }
      );
    }

    // Verify order exists and matches payload
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        amount,
        status,
        created_at,
        buyer_id,
        seller_id,
        buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
        seller:profiles!orders_seller_id_fkey(id, name, avatar_url),
        nft:nfts(id, title, media_url)
      `)
      .eq('id', decodedPayload.orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate order details match payload
    if (
      orderData.buyer_id !== decodedPayload.buyerId ||
      orderData.seller_id !== decodedPayload.sellerId ||
      Math.abs(orderData.amount - decodedPayload.amount) > 0.0001
    ) {
      return NextResponse.json(
        { error: 'Order details do not match QR code' },
        { status: 400 }
      );
    }

    // Check if QR record exists
    const { data: qrRecord, error: qrError } = await supabase
      .from('qr_records')
      .select('*')
      .eq('order_id', decodedPayload.orderId)
      .eq('payload_hash', payload)
      .single();

    if (qrError && qrError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('QR record fetch error:', qrError);
      return NextResponse.json(
        { error: 'Failed to verify QR record' },
        { status: 500 }
      );
    }

    // Log the scan
    const scanData = {
      scanned_at: new Date().toISOString(),
      scanned_by_ip: request.headers.get('x-forwarded-for') || 'unknown',
      status: 'scanned',
    };

    if (qrRecord) {
      await supabase
        .from('qr_records')
        .update(scanData)
        .eq('id', qrRecord.id);
    }

    return NextResponse.json({
      isValid: true,
      order: {
        ...orderData,
        buyer: Array.isArray(orderData.buyer) ? orderData.buyer[0] : orderData.buyer,
        seller: Array.isArray(orderData.seller) ? orderData.seller[0] : orderData.seller,
        nft: Array.isArray(orderData.nft) ? orderData.nft[0] : orderData.nft,
      },
      scannedAt: new Date().toISOString(),
      qrRecord: qrRecord || null,
    });

  } catch (error: any) {
    console.error('QR verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    // Update QR record status
    const { error } = await supabase
      .from('qr_records')
      .update({ 
        status,
        updated_at: new Date().toISOString() 
      })
      .eq('order_id', orderId);

    if (error) {
      console.error('QR record update error:', error);
      return NextResponse.json(
        { error: 'Failed to update QR record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'QR record updated successfully',
      status 
    });

  } catch (error: any) {
    console.error('QR update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const userId = url.searchParams.get("userId");
    const status = url.searchParams.get("status");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
        seller:profiles!orders_seller_id_fkey(id, name, avatar_url),
        nft:nfts(id, title, media_url, price)
      `
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (userId) {
      query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    }

    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error("Orders fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    if (userId) {
      countQuery = countQuery.or(
        `buyer_id.eq.${userId},seller_id.eq.${userId}`
      );
    }

    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Orders API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerSupabaseClient({ throwOnCookieWrite: false });
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const orderData = await request.json();

    // Validate required fields
    const required = ["nft_id", "amount", "type"];
    for (const field of required) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Get Item details
    const { data: nft, error: nftError } = await supabase
      .from("nfts")
      .select("id, owner_id, price, status")
      .eq("id", orderData.nft_id)
      .single();

    if (nftError || !nft) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (nft.status !== "active") {
      return NextResponse.json(
        { error: 'Item is not available for purchase' },
        { status: 400 }
      );
    }

    if (nft.owner_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot purchase your own Item' },
        { status: 400 }
      );
    }

    // For buy orders, check if amount matches price
    if (orderData.type === "buy" && parseFloat(orderData.amount) < nft.price) {
      return NextResponse.json(
        { error: 'Amount is less than Item price' },
        { status: 400 }
      );
    }

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        nft_id: orderData.nft_id,
        buyer_id: user.id,
        seller_id: nft.owner_id,
        price: parseFloat(orderData.amount), // Use 'price' column to match schema
        type: orderData.type,
        status: orderData.type === "buy" ? "completed" : "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        buyer:profiles!orders_buyer_id_fkey(id, name, avatar_url),
        seller:profiles!orders_seller_id_fkey(id, name, avatar_url),
        nft:nfts(id, title, media_url, price)
      `
      )
      .single();

    if (error) {
      console.error("Order creation error:", error);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // If it's a buy order, transfer ownership
    if (orderData.type === "buy") {
      const { error: transferError } = await supabase
        .from("nfts")
        .update({
          owner_id: user.id,
          status: "sold",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderData.nft_id);

      if (transferError) {
        console.error('Item transfer error:', transferError);
        // Note: Order is created but transfer failed
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error("Order creation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

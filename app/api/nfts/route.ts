import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const status = url.searchParams.get('status') || 'active';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('nfts')
      .select(`
        *,
        creator:creator_id(id, name, avatar_url),
        owner:owner_id(id, name, avatar_url),
        likes_count:likes(count),
        views
      `)
      .eq('status', status);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: nfts, error, count } = await query;

    if (error) {
      console.error('Item fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch NFTs' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('nfts')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    return NextResponse.json({
      nfts: nfts || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('Item API error:', error);
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

    const nftData = await request.json();

    // Validate required fields
    const required = ['title', 'description', 'price', 'category', 'media_url'];
    for (const field of required) {
      if (!nftData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Create Item
    const { data: nft, error } = await supabase
      .from('nfts')
      .insert({
        title: nftData.title,
        description: nftData.description,
        price: parseFloat(nftData.price),
        category: nftData.category,
        media_url: nftData.media_url,
        media_type: nftData.media_type || 'image',
        creator_id: user.id,
        owner_id: user.id,
        status: 'active',
        auction_end_time: nftData.auction_end_time || null,
        royalty_percentage: nftData.royalty_percentage || 0,
        properties: nftData.properties || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        creator:creator_id(id, name, avatar_url),
        owner:owner_id(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Item creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create Item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ nft }, { status: 201 });

  } catch (error: any) {
    console.error('Item creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
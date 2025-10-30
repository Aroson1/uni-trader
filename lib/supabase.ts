"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a singleton client instance with proper configuration
let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  // Return existing client if already created (singleton pattern for browser)
  if (client) {
    return client;
  }

  // Create new client with proper SSR configuration
  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
      },
    },
  });

  return client;
}

// Create client immediately if in browser, otherwise create on first access
export const supabase = typeof window !== 'undefined' 
  ? getSupabaseBrowserClient() 
  : new Proxy({} as SupabaseClient, {
      get() {
        if (typeof window === 'undefined') {
          throw new Error('Supabase client is not available on the server. Use createServerSupabaseClient instead.');
        }
        return getSupabaseBrowserClient();
      }
    });

// Keep all your Database types exactly as they are
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          bio: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          wallet_address: string | null;
          is_verified: boolean;
          social_links: Record<string, any>;
          preferences: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          wallet_address?: string | null;
          is_verified?: boolean;
          social_links?: Record<string, any>;
          preferences?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          wallet_address?: string | null;
          is_verified?: boolean;
          social_links?: Record<string, any>;
          preferences?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      nfts: {
        Row: {
          id: string;
          title: string;
          description: string;
          media_url: string;
          thumbnail_url: string | null;
          owner_id: string;
          creator_id: string;
          price: number;
          currency: string;
          status: "available" | "sold" | "auction" | "draft" | "burned";
          sale_type: "fixed" | "auction" | "bid" | "not_for_sale";
          category: string;
          tags: string[];
          metadata: Record<string, any>;
          attributes: Record<string, any>[];
          views: number;
          likes: number;
          royalty_percentage: number;
          auction_end_time: string | null;
          auction_start_time: string | null;
          minimum_bid: number | null;
          is_featured: boolean;
          blockchain: string;
          token_id: string | null;
          contract_address: string | null;
          ar_link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          media_url: string;
          thumbnail_url?: string | null;
          owner_id: string;
          creator_id: string;
          price?: number;
          currency?: string;
          status?: "available" | "sold" | "auction" | "draft" | "burned";
          sale_type?: "fixed" | "auction" | "bid" | "not_for_sale";
          category?: string;
          tags?: string[];
          metadata?: Record<string, any>;
          attributes?: Record<string, any>[];
          views?: number;
          likes?: number;
          royalty_percentage?: number;
          auction_end_time?: string | null;
          auction_start_time?: string | null;
          minimum_bid?: number | null;
          is_featured?: boolean;
          blockchain?: string;
          token_id?: string | null;
          contract_address?: string | null;
          ar_link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          media_url?: string;
          thumbnail_url?: string | null;
          owner_id?: string;
          creator_id?: string;
          price?: number;
          currency?: string;
          status?: "available" | "sold" | "auction" | "draft" | "burned";
          sale_type?: "fixed" | "auction" | "bid" | "not_for_sale";
          category?: string;
          tags?: string[];
          metadata?: Record<string, any>;
          attributes?: Record<string, any>[];
          views?: number;
          likes?: number;
          royalty_percentage?: number;
          auction_end_time?: string | null;
          auction_start_time?: string | null;
          minimum_bid?: number | null;
          is_featured?: boolean;
          blockchain?: string;
          token_id?: string | null;
          contract_address?: string | null;
          ar_link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          nft_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency: string;
          status:
            | "pending"
            | "processing"
            | "completed"
            | "cancelled"
            | "failed"
            | "refunded";
          payment_method: string;
          transaction_hash: string | null;
          gas_fee: number | null;
          platform_fee: number | null;
          royalty_fee: number | null;
          total_amount: number | null;
          payment_data: Record<string, any>;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          nft_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency?: string;
          status?:
            | "pending"
            | "processing"
            | "completed"
            | "cancelled"
            | "failed"
            | "refunded";
          payment_method?: string;
          transaction_hash?: string | null;
          gas_fee?: number | null;
          platform_fee?: number | null;
          royalty_fee?: number | null;
          total_amount?: number | null;
          payment_data?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          nft_id?: string;
          buyer_id?: string;
          seller_id?: string;
          amount?: number;
          currency?: string;
          status?:
            | "pending"
            | "processing"
            | "completed"
            | "cancelled"
            | "failed"
            | "refunded";
          payment_method?: string;
          transaction_hash?: string | null;
          gas_fee?: number | null;
          platform_fee?: number | null;
          royalty_fee?: number | null;
          total_amount?: number | null;
          payment_data?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      bids: {
        Row: {
          id: string;
          nft_id: string;
          bidder_id: string;
          amount: number;
          currency: string;
          status:
            | "active"
            | "accepted"
            | "rejected"
            | "outbid"
            | "withdrawn"
            | "expired";
          expires_at: string | null;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nft_id: string;
          bidder_id: string;
          amount: number;
          currency?: string;
          status?:
            | "active"
            | "accepted"
            | "rejected"
            | "outbid"
            | "withdrawn"
            | "expired";
          expires_at?: string | null;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nft_id?: string;
          bidder_id?: string;
          amount?: number;
          currency?: string;
          status?:
            | "active"
            | "accepted"
            | "rejected"
            | "outbid"
            | "withdrawn"
            | "expired";
          expires_at?: string | null;
          message?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          participant1_id: string;
          participant2_id: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant1_id: string;
          participant2_id: string;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant1_id?: string;
          participant2_id?: string;
          last_message_at?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Record<string, any>;
          read_at: string | null;
          action_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, any>;
          read_at?: string | null;
          action_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Record<string, any>;
          read_at?: string | null;
          action_url?: string | null;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          description: string;
          metadata: Record<string, any>;
          nft_id: string | null;
          order_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          description: string;
          metadata?: Record<string, any>;
          nft_id?: string | null;
          order_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          description?: string;
          metadata?: Record<string, any>;
          nft_id?: string | null;
          order_id?: string | null;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          user_id: string;
          nft_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          nft_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          nft_id?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          name: string;
          description: string;
          cover_image_url: string | null;
          creator_id: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          cover_image_url?: string | null;
          creator_id: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          cover_image_url?: string | null;
          creator_id?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      nft_with_creator: {
        Row: {
          id: string;
          title: string;
          description: string;
          media_url: string;
          owner_id: string;
          creator_id: string;
          price: number;
          status: string;
          creator_name: string;
          creator_avatar: string | null;
          creator_verified: boolean;
          created_at: string;
        };
      };
      nft_with_owner: {
        Row: {
          id: string;
          title: string;
          description: string;
          media_url: string;
          owner_id: string;
          creator_id: string;
          price: number;
          status: string;
          owner_name: string;
          owner_avatar: string | null;
          owner_verified: boolean;
          created_at: string;
        };
      };
    };
    Functions: {
      create_notification: {
        Args: {
          p_user_id: string;
          p_type: string;
          p_title: string;
          p_message: string;
          p_data?: Record<string, any>;
          p_action_url?: string;
        };
        Returns: string;
      };
      log_activity: {
        Args: {
          p_user_id: string;
          p_type: string;
          p_description: string;
          p_metadata?: Record<string, any>;
          p_nft_id?: string;
          p_order_id?: string;
        };
        Returns: string;
      };
    };
  };
};

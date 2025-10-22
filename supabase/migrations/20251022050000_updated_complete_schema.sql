/*
  # Updated Unitrader Schema - Complete Migration
  
  This migration creates a comprehensive and updated schema for the Unitrader NFT marketplace
  with proper authentication integration, email support, and enhanced features.
  
  ## Key Improvements:
  - Added email field to profiles table
  - Fixed authentication trigger function
  - Enhanced RLS policies for better security
  - Added missing indexes for performance
  - Added notification and activity tracking
  - Improved data types and constraints
  - Added proper foreign key relationships
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing tables and recreate with updated schema
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS qr_records CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS nfts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with email support
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text UNIQUE,
  bio text DEFAULT '',
  avatar_url text,
  banner_url text,
  wallet_address text UNIQUE,
  is_verified boolean DEFAULT false,
  social_links jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create nfts table with enhanced features
CREATE TABLE nfts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  media_url text NOT NULL,
  thumbnail_url text,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  price numeric(20, 8) DEFAULT 0,
  currency text DEFAULT 'ETH',
  status text DEFAULT 'available' CHECK (status IN ('available', 'sold', 'auction', 'draft', 'burned')),
  sale_type text DEFAULT 'fixed' CHECK (sale_type IN ('fixed', 'auction', 'bid', 'not_for_sale')),
  category text DEFAULT 'art',
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  attributes jsonb DEFAULT '[]',
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  royalty_percentage numeric(5, 2) DEFAULT 0 CHECK (royalty_percentage >= 0 AND royalty_percentage <= 100),
  auction_end_time timestamptz,
  auction_start_time timestamptz,
  minimum_bid numeric(20, 8),
  is_featured boolean DEFAULT false,
  blockchain text DEFAULT 'ethereum',
  token_id text,
  contract_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table with enhanced tracking
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid REFERENCES nfts(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(20, 8) NOT NULL,
  currency text DEFAULT 'ETH',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed', 'refunded')),
  payment_method text DEFAULT 'crypto',
  transaction_hash text,
  gas_fee numeric(20, 8),
  platform_fee numeric(20, 8),
  royalty_fee numeric(20, 8),
  total_amount numeric(20, 8),
  payment_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create bids table
CREATE TABLE bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid REFERENCES nfts(id) ON DELETE CASCADE NOT NULL,
  bidder_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(20, 8) NOT NULL,
  currency text DEFAULT 'ETH',
  status text DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected', 'outbid', 'withdrawn', 'expired')),
  expires_at timestamptz,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant_two_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  nft_id uuid REFERENCES nfts(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_participants CHECK (participant_one_id != participant_two_id),
  UNIQUE(participant_one_id, participant_two_id)
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  from_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachments jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read_at timestamptz,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Create activities table for tracking user actions
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  nft_id uuid REFERENCES nfts(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create QR records table
CREATE TABLE qr_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  payload_hash text NOT NULL,
  verification_code text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  scanned_at timestamptz,
  scanned_by_ip text,
  scanned_by_user_agent text,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'scanned', 'verified', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create likes table
CREATE TABLE likes (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nft_id uuid REFERENCES nfts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, nft_id)
);

-- Create follows table for user following
CREATE TABLE follows (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create collections table
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  cover_image_url text,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collection_nfts junction table
CREATE TABLE collection_nfts (
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  nft_id uuid REFERENCES nfts(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (collection_id, nft_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_nfts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- NFT policies
CREATE POLICY "Public NFTs are viewable by everyone"
  ON nfts FOR SELECT
  USING (status != 'draft' OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create NFTs"
  ON nfts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id AND auth.uid() = creator_id);

CREATE POLICY "Owners can update their NFTs"
  ON nfts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their NFTs"
  ON nfts FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Order policies
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Bid policies
CREATE POLICY "Anyone can view bids on public NFTs"
  ON bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfts
      WHERE nfts.id = bids.nft_id
      AND nfts.status IN ('available', 'auction')
    )
  );

CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Bidders can update their own bids"
  ON bids FOR UPDATE
  TO authenticated
  USING (auth.uid() = bidder_id)
  WITH CHECK (auth.uid() = bidder_id);

-- Conversation policies
CREATE POLICY "Participants can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)
  WITH CHECK (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

-- Message policies
CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = from_id OR auth.uid() = to_id);

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_id);

CREATE POLICY "Message recipients can mark as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_id)
  WITH CHECK (auth.uid() = to_id);

-- Notification policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Activity policies
CREATE POLICY "Users can view their own activities"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create activities"
  ON activities FOR INSERT
  WITH CHECK (true);

-- QR record policies
CREATE POLICY "Users can view QR records for their orders"
  ON qr_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = qr_records.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can create QR records"
  ON qr_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- Like policies
CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like NFTs"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike NFTs"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Follow policies
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Collection policies
CREATE POLICY "Public collections are viewable by everyone"
  ON collections FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their collections"
  ON collections FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Collection NFTs policies
CREATE POLICY "Anyone can view collection NFTs if collection is public"
  ON collection_nfts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_nfts.collection_id
      AND (collections.is_public = true OR collections.creator_id = auth.uid())
    )
  );

CREATE POLICY "Collection creators can manage NFTs in their collections"
  ON collection_nfts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_id
      AND collections.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_id
      AND collections.creator_id = auth.uid()
    )
  );

-- Create performance indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX idx_nfts_owner ON nfts(owner_id);
CREATE INDEX idx_nfts_creator ON nfts(creator_id);
CREATE INDEX idx_nfts_status ON nfts(status);
CREATE INDEX idx_nfts_category ON nfts(category);
CREATE INDEX idx_nfts_created_at ON nfts(created_at DESC);
CREATE INDEX idx_nfts_price ON nfts(price);
CREATE INDEX idx_nfts_featured ON nfts(is_featured) WHERE is_featured = true;
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_nft ON orders(nft_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_bids_nft ON bids(nft_id);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_amount ON bids(amount DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_read_at ON messages(read_at);
CREATE INDEX idx_conversations_participants ON conversations(participant_one_id, participant_two_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read_at);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_likes_nft ON likes(nft_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Create full-text search indexes
CREATE INDEX idx_nfts_search ON nfts USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_profiles_search ON profiles USING gin(to_tsvector('english', name || ' ' || coalesce(bio, '')));

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfts_updated_at
  BEFORE UPDATE ON nfts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update NFT like count
CREATE OR REPLACE FUNCTION update_nft_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE nfts SET likes = likes + 1 WHERE id = NEW.nft_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE nfts SET likes = likes - 1 WHERE id = OLD.nft_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update NFT likes count
CREATE TRIGGER update_nft_likes_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_nft_likes_count();

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation last message time
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}',
  p_action_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create activity log
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}',
  p_nft_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO activities (user_id, type, description, metadata, nft_id, order_id)
  VALUES (p_user_id, p_type, p_description, p_metadata, p_nft_id, p_order_id)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for common queries
CREATE OR REPLACE VIEW nft_with_creator AS
SELECT 
  n.*,
  p.name as creator_name,
  p.avatar_url as creator_avatar,
  p.is_verified as creator_verified
FROM nfts n
JOIN profiles p ON n.creator_id = p.id;

CREATE OR REPLACE VIEW nft_with_owner AS
SELECT 
  n.*,
  p.name as owner_name,
  p.avatar_url as owner_avatar,
  p.is_verified as owner_verified
FROM nfts n
JOIN profiles p ON n.owner_id = p.id;

-- Note: Sample data will be created automatically when users sign up
-- The handle_new_user() function will create profiles for new users
-- Add wallet balance and payment fields to profiles table

-- Add wallet_balance column to store KFC balance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(20,8) DEFAULT 0.00;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_balance ON profiles(wallet_balance);
DROP TABLE payments CASCADE;
-- Create payments table to track Stripe transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT DEFAULT 'inr',
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  kfc_amount DECIMAL(20,8), -- Amount of KFC purchased
  kfc_price_inr DECIMAL(10,2), -- KFC price in INR at time of purchase
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Add trigger for updated_at on payments
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
  user_id UUID,
  amount_to_add DECIMAL(20,8)
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET wallet_balance = wallet_balance + amount_to_add 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update bids table to include constraint checking wallet balance
-- First, let's add a trigger function to check wallet balance on bids
CREATE OR REPLACE FUNCTION check_bid_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if bidder has sufficient balance
  IF (SELECT wallet_balance FROM profiles WHERE id = NEW.bidder_id) < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance to place bid';
  END IF;
  
  -- Check if bidder is not the NFT creator/owner
  IF EXISTS (
    SELECT 1 FROM nfts 
    WHERE id = NEW.nft_id 
    AND (creator_id = NEW.bidder_id OR owner_id = NEW.bidder_id)
  ) THEN
    RAISE EXCEPTION 'NFT creator/owner cannot bid on their own item';
  END IF;
  
  -- Deduct the bid amount from wallet immediately
  UPDATE profiles 
  SET wallet_balance = wallet_balance - NEW.amount 
  WHERE id = NEW.bidder_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate bids
DROP TRIGGER IF EXISTS validate_bid_constraints ON bids;
CREATE TRIGGER validate_bid_constraints
  BEFORE INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION check_bid_wallet_balance();

-- Function to handle bid updates (refund previous bids)
CREATE OR REPLACE FUNCTION handle_bid_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If bid is being marked as outbid, refund the amount
  IF OLD.status = 'active' AND NEW.status = 'outbid' THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance + OLD.amount 
    WHERE id = OLD.bidder_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bid updates
DROP TRIGGER IF EXISTS handle_bid_status_change ON bids;
CREATE TRIGGER handle_bid_status_change
  AFTER UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_bid_update();

-- Function to handle NFT purchase/auction completion
CREATE OR REPLACE FUNCTION complete_nft_transaction(
  p_nft_id UUID,
  p_buyer_id UUID,
  p_amount DECIMAL(20,8)
)
RETURNS VOID AS $$
DECLARE
  v_seller_id UUID;
  v_seller_balance DECIMAL(20,8);
  v_buyer_balance DECIMAL(20,8);
  v_order_id UUID;
  v_verification_code TEXT;
BEGIN
  -- Get seller (current owner) and check balances
  SELECT owner_id INTO v_seller_id FROM nfts WHERE id = p_nft_id;
  SELECT wallet_balance INTO v_buyer_balance FROM profiles WHERE id = p_buyer_id;
  SELECT wallet_balance INTO v_seller_balance FROM profiles WHERE id = v_seller_id;
  
  -- Validate buyer has sufficient balance
  IF v_buyer_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  
  -- Deduct KFC from buyer immediately
  UPDATE profiles 
  SET wallet_balance = wallet_balance - p_amount 
  WHERE id = p_buyer_id;
  
  -- Update NFT ownership and status
  UPDATE nfts 
  SET 
    owner_id = p_buyer_id,
    status = 'sold'
  WHERE id = p_nft_id;
  
  -- Create order with verification code (seller gets paid after verification)
  SELECT order_id, verification_code 
  INTO v_order_id, v_verification_code
  FROM create_order_with_verification(p_nft_id, p_buyer_id, v_seller_id, p_amount);
  
  -- Mark winning bid as accepted (if auction)
  UPDATE bids 
  SET status = 'accepted'
  WHERE nft_id = p_nft_id AND bidder_id = p_buyer_id AND amount = p_amount;
  
  -- Mark other bids as outbid
  UPDATE bids 
  SET status = 'outbid'
  WHERE nft_id = p_nft_id AND bidder_id != p_buyer_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to handle auction expiration
CREATE OR REPLACE FUNCTION handle_auction_expiration()
RETURNS VOID AS $$
DECLARE
  auction_record RECORD;
  highest_bid RECORD;
BEGIN
  -- Find expired auctions
  FOR auction_record IN 
    SELECT id, owner_id, title 
    FROM nfts 
    WHERE sale_type = 'auction' 
    AND status = 'active' 
    AND auction_end_time < NOW()
  LOOP
    -- Find highest bid for this auction
    SELECT bidder_id, amount
    INTO highest_bid
    FROM bids
    WHERE nft_id = auction_record.id 
    AND status = 'active'
    ORDER BY amount DESC
    LIMIT 1;
    
    -- If there's a highest bid, complete the transaction
    IF highest_bid.bidder_id IS NOT NULL THEN
      PERFORM complete_nft_transaction(
        auction_record.id,
        highest_bid.bidder_id,
        highest_bid.amount
      );
    ELSE
      -- No bids, mark auction as cancelled
      UPDATE nfts 
      SET status = 'cancelled'
      WHERE id = auction_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add QR verification system to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verification_code TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'completed', 'cancelled', 'awaiting_verification'));

-- Update orders default status
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'awaiting_verification';

-- Function to generate verification code for orders
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Function to create order with verification code
CREATE OR REPLACE FUNCTION create_order_with_verification(
  p_nft_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_price DECIMAL(20,8)
)
RETURNS TABLE(order_id UUID, verification_code TEXT) AS $$
DECLARE
  v_order_id UUID;
  v_verification_code TEXT;
BEGIN
  -- Generate unique verification code
  LOOP
    v_verification_code := generate_verification_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE orders.verification_code = v_verification_code);
  END LOOP;
  
  -- Create order
  INSERT INTO orders (nft_id, buyer_id, seller_id, price, status, verification_code)
  VALUES (p_nft_id, p_buyer_id, p_seller_id, p_price, 'awaiting_verification', v_verification_code)
  RETURNING id INTO v_order_id;
  
  RETURN QUERY SELECT v_order_id, v_verification_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify order and complete payment to seller
CREATE OR REPLACE FUNCTION verify_order_payment(
  p_verification_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, order_id UUID) AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Get order by verification code
  SELECT * INTO v_order
  FROM orders 
  WHERE orders.verification_code = p_verification_code 
  AND orders.status = 'awaiting_verification';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or already verified order'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Transfer payment to seller
  UPDATE profiles 
  SET wallet_balance = wallet_balance + v_order.price 
  WHERE id = v_order.seller_id;
  
  -- Mark order as completed
  UPDATE orders 
  SET status = 'completed', verified_at = NOW()
  WHERE id = v_order.id;
  
  RETURN QUERY SELECT TRUE, 'Order verified and payment completed'::TEXT, v_order.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
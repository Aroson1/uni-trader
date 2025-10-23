-- Fix orders table schema inconsistency
-- This migration ensures the orders table has the correct schema with 'price' column
-- and all necessary fields for the wallet verification system

-- First, check and add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add price column if it doesn't exist (rename from amount if needed)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'amount') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'orders' AND column_name = 'price') THEN
    -- Rename amount to price
    ALTER TABLE orders RENAME COLUMN amount TO price;
    RAISE NOTICE 'Renamed orders.amount to orders.price';
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'price') THEN
    -- Add price column if neither exists
    ALTER TABLE orders ADD COLUMN price DECIMAL(20,8) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added orders.price column';
  END IF;

  -- Ensure verification_code column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'verification_code') THEN
    ALTER TABLE orders ADD COLUMN verification_code TEXT UNIQUE;
    RAISE NOTICE 'Added orders.verification_code column';
  END IF;

  -- Ensure verified_at column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'verified_at') THEN
    ALTER TABLE orders ADD COLUMN verified_at TIMESTAMPTZ;
    RAISE NOTICE 'Added orders.verified_at column';
  END IF;

  -- Ensure qr_code column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'qr_code') THEN
    ALTER TABLE orders ADD COLUMN qr_code TEXT;
    RAISE NOTICE 'Added orders.qr_code column';
  END IF;

  -- Ensure type column exists (for compatibility with API)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'type') THEN
    ALTER TABLE orders ADD COLUMN type TEXT DEFAULT 'buy';
    RAISE NOTICE 'Added orders.type column';
  END IF;
END $$;

-- Update the status constraint to include 'awaiting_verification'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed', 'refunded', 'awaiting_verification'));

-- Set default status to 'pending' (the API will override this for verification flows)
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

-- Create index on verification_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_verification_code ON orders(verification_code) WHERE verification_code IS NOT NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Recreate the verification functions to ensure they're using the correct schema
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

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
  -- Validate price is not null
  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'Invalid price: price must be greater than 0';
  END IF;

  -- Generate unique verification code
  LOOP
    v_verification_code := generate_verification_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE orders.verification_code = v_verification_code);
  END LOOP;
  
  -- Create order with explicit column names
  INSERT INTO orders (nft_id, buyer_id, seller_id, price, status, verification_code)
  VALUES (p_nft_id, p_buyer_id, p_seller_id, p_price, 'awaiting_verification', v_verification_code)
  RETURNING id INTO v_order_id;
  
  RETURN QUERY SELECT v_order_id, v_verification_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  
  -- Validate price exists
  IF v_order.price IS NULL THEN
    RAISE EXCEPTION 'Order price is NULL, cannot complete verification';
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_order_with_verification TO authenticated;
GRANT EXECUTE ON FUNCTION verify_order_payment TO authenticated;
GRANT EXECUTE ON FUNCTION generate_verification_code TO authenticated;


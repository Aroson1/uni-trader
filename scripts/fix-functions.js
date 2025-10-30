const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixVerificationFunction() {
  console.log(
    "Fixing verification function to ensure NFT status is updated..."
  );

  const { data, error } = await supabase.rpc("exec", {
    sql: `
-- Update the verify_order_payment function to ensure NFT status is marked as sold
CREATE OR REPLACE FUNCTION verify_order_payment(
  p_verification_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, order_id UUID) AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Get order by verification code (with explicit table prefix)
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
  
  -- Ensure NFT status is marked as sold (in case it wasn't updated during purchase)
  UPDATE nfts 
  SET status = 'sold'
  WHERE id = v_order.nft_id;
  
  RETURN QUERY SELECT TRUE, 'Order verified and payment completed'::TEXT, v_order.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the create_order_with_verification function as well
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
    `,
  });

  if (error) {
    console.error("Error fixing function:", error);
  } else {
    console.log("Functions fixed successfully!");
  }
}

fixVerificationFunction();

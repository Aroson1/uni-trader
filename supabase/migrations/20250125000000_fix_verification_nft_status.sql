-- Fix verification function to ensure NFT status is updated
-- This ensures that when an order is verified, the NFT status is marked as 'sold'


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
  
  -- Transfer NFT ownership to buyer and mark as sold
  UPDATE nfts 
  SET 
    status = 'sold',
    owner_id = v_order.buyer_id
  WHERE id = v_order.nft_id;
  
  RETURN QUERY SELECT TRUE, 'Order verified and payment completed'::TEXT, v_order.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically transfer NFT ownership when orders are completed
-- This ensures NFT ownership is always updated when order status changes to 'completed'

-- Function to handle NFT ownership transfer on order completion
CREATE OR REPLACE FUNCTION handle_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed from non-completed to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Transfer NFT ownership to the buyer
    UPDATE nfts 
    SET 
      owner_id = NEW.buyer_id,
      status = CASE 
        WHEN status != 'sold' THEN 'sold'
        ELSE status 
      END
    WHERE id = NEW.nft_id;
    
    -- Log the ownership transfer (optional)
    RAISE NOTICE 'NFT ownership transferred: NFT % from seller % to buyer %', 
      NEW.nft_id, NEW.seller_id, NEW.buyer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_order_completion ON orders;
CREATE TRIGGER trigger_order_completion
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_completion();
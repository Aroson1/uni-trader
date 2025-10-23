-- Fix existing completed orders where NFT ownership wasn't transferred
-- This ensures all completed orders have their NFTs properly owned by the buyer

-- Update NFTs to be owned by the buyer for all completed orders
UPDATE nfts 
SET owner_id = orders.buyer_id
FROM orders 
WHERE nfts.id = orders.nft_id 
AND orders.status = 'completed'
AND nfts.owner_id = nfts.creator_id; -- Only update if still owned by creator

-- Log the changes
INSERT INTO system_logs (message, created_at) 
SELECT 
  'Fixed NFT ownership for ' || COUNT(*) || ' completed orders',
  NOW()
FROM orders 
WHERE status = 'completed';

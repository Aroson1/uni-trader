-- Add AR link column to NFTs table
-- This migration adds an optional ar_link field to store AR (Augmented Reality) links for NFTs

-- Add ar_link column to nfts table
ALTER TABLE nfts ADD COLUMN IF NOT EXISTS ar_link text;

-- Add comment to document the column
COMMENT ON COLUMN nfts.ar_link IS 'Optional URL link to AR (Augmented Reality) view of the NFT';

-- Create index for better performance when filtering NFTs with AR links
CREATE INDEX IF NOT EXISTS idx_nfts_ar_link ON nfts(ar_link) WHERE ar_link IS NOT NULL;

-- The column allows NULL values by default, which is what we want
-- No additional constraints needed as this is an optional feature
-- Add missing columns to nfts table and fix status values
-- This migration adds the tags column and updates status values

-- Add tags column as JSONB array
ALTER TABLE nfts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Update status constraint to include 'available' 
ALTER TABLE nfts DROP CONSTRAINT IF EXISTS nfts_status_check;
ALTER TABLE nfts ADD CONSTRAINT nfts_status_check 
  CHECK (status IN ('draft', 'active', 'available', 'sold', 'cancelled'));

-- Update sale_type constraint to include 'bid'
ALTER TABLE nfts DROP CONSTRAINT IF EXISTS nfts_sale_type_check;
ALTER TABLE nfts ADD CONSTRAINT nfts_sale_type_check 
  CHECK (sale_type IN ('fixed', 'auction', 'bid'));

-- Create index on tags for better query performance
CREATE INDEX IF NOT EXISTS idx_nfts_tags ON nfts USING GIN (tags);

-- Create index on category for better filtering
CREATE INDEX IF NOT EXISTS idx_nfts_category ON nfts (category);

-- Create index on status for better filtering
CREATE INDEX IF NOT EXISTS idx_nfts_status ON nfts (status);
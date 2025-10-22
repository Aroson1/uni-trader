-- Create storage buckets and policies
-- Run this after setting up your Supabase project

-- Create the media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Authenticated users can upload media files" ON storage.objects;
DROP POLICY IF EXISTS "Public media files are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media files" ON storage.objects;

-- Allow authenticated users to upload files to media bucket
CREATE POLICY "Authenticated users can upload to media bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Allow everyone to view files from media bucket
CREATE POLICY "Anyone can view media files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media');

-- Allow authenticated users to update files in media bucket
CREATE POLICY "Authenticated users can update media files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete files in media bucket
CREATE POLICY "Authenticated users can delete media files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);
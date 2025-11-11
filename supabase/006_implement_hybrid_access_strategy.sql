-- =====================================================
-- Migration: Implement Hybrid Access Strategy
-- Version: 006  
-- Date: 2024-11-11
-- Description: Move videos to private bucket while keeping images public
-- =====================================================

-- Purpose:
-- This implements the optimal security strategy:
-- - Public bucket: images for homepage (index.html)
-- - Private bucket: videos (admin & remote controlled)
-- - Admin-only bucket: sensitive files

-- Step 1: Create private policies for video bucket
-- ----------------------------------------------------

-- Policy: Only authenticated users can view videos
CREATE POLICY "Users can view videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'slideshow-videos' AND
  auth.role() = 'authenticated'
);

-- Policy: Only admin users can upload/manage videos  
CREATE POLICY "Admins can manage videos" ON storage.objects
FOR ALL USING (
  bucket_id = 'slideshow-videos' AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Step 2: Keep images public for homepage
-- ----------------------------------------------------
-- No policy on 'slideshow-images' bucket = remains public

-- Step 3: Add access tracking columns
-- ----------------------------------------------------
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS access_level VARCHAR DEFAULT 'public';

-- Update access levels based on content
UPDATE image_durations 
SET access_level = CASE 
  WHEN is_video = true THEN 'private'
  WHEN filename LIKE 'admin%' THEN 'admin-only' 
  ELSE 'public'
END;

-- Add index for access filtering
CREATE INDEX IF NOT EXISTS idx_image_durations_access_level 
ON image_durations(access_level);

-- Step 4: Create access logging table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  resource_type VARCHAR(50), -- 'video', 'image', 'admin'
  resource_path VARCHAR(255),
  accessed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  success BOOLEAN DEFAULT true
);

-- =====================================================
-- Verification Query:
-- SELECT bucket_id, policy_name, allowed_operations 
-- FROM pg_policies 
-- WHERE table_name = 'objects' AND schema_name = 'storage';
-- =====================================================

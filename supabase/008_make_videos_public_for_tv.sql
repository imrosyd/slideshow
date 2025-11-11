-- =====================================================
-- Migration: Make Videos Public for TV Playback
-- Version: 008  
-- Date: 2025-11-11
-- Description: Change video bucket to public access with aggressive caching
-- =====================================================

-- Purpose:
-- Enable TV to play videos without authentication for 9+ hours
-- - Public bucket: videos (no login required)
-- - Aggressive browser caching (7 days)
-- - Zero bandwidth waste for repeated playback

-- Step 1: Drop existing private policies for videos
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Users can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage videos" ON storage.objects;

-- Step 2: Create public read policy for videos
-- ----------------------------------------------------
CREATE POLICY "Public can view videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'slideshow-videos'
);

-- Step 3: Admin-only write policy for videos
-- ----------------------------------------------------
-- Note: INSERT policy uses WITH CHECK, not USING
CREATE POLICY "Admins can manage videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'slideshow-videos' AND
  (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role')
);

CREATE POLICY "Admins can update videos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'slideshow-videos' AND
  (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role')
) WITH CHECK (
  bucket_id = 'slideshow-videos' AND
  (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role')
);

CREATE POLICY "Admins can delete videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'slideshow-videos' AND
  (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role')
);

-- Step 4: Update access levels (videos now public)
-- ----------------------------------------------------
-- Only update if access_level column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'image_durations' 
    AND column_name = 'access_level'
  ) THEN
    EXECUTE 'UPDATE image_durations SET access_level = ''public'' WHERE is_video = true';
  END IF;
END $$;

-- Step 5: Add index for better performance (if is_video column exists)
-- ----------------------------------------------------
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'image_durations' 
    AND column_name = 'is_video'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_image_durations_is_video 
    ON image_durations(is_video) WHERE is_video = true;
  END IF;
END $$;

-- =====================================================
-- Verification Query:
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'objects' 
-- AND schemaname = 'storage'
-- AND policyname LIKE '%video%';
-- =====================================================

-- Expected Result:
-- 1. "Public can view videos" - SELECT - bucket_id = 'slideshow-videos'
-- 2. "Admins can manage videos" - INSERT - bucket_id = 'slideshow-videos' AND admin
-- 3. "Admins can update videos" - UPDATE - bucket_id = 'slideshow-videos' AND admin
-- 4. "Admins can delete videos" - DELETE - bucket_id = 'slideshow-videos' AND admin

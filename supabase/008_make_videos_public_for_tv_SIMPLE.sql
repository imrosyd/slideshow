-- =====================================================
-- Migration: Make Videos Public for TV (SIMPLE VERSION)
-- Version: 008-SIMPLE
-- Date: 2025-11-11
-- Description: Simplest way to make videos public
-- =====================================================

-- SIMPLE APPROACH: Just delete all video policies
-- This makes videos inherit the bucket's public setting

-- Step 1: Drop ALL existing policies for video bucket
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Users can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;

-- Step 2: Update access levels (videos now public)
-- ----------------------------------------------------
-- Only update if columns exist (skip if not)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'image_durations' 
    AND column_name = 'access_level'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'image_durations' 
    AND column_name = 'is_video'
  ) THEN
    EXECUTE 'UPDATE image_durations SET access_level = ''public'' WHERE is_video = true';
  END IF;
END $$;

-- Step 3: DONE! 
-- ----------------------------------------------------
-- Now just set the bucket to PUBLIC in Supabase UI:
-- Storage → Buckets → slideshow-videos → Make Public

-- For service role (backend API), access will work automatically
-- For public users, they can read once bucket is set to public

-- =====================================================
-- Verification:
-- =====================================================

-- Check if policies are removed:
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND qual LIKE '%slideshow-videos%';
-- Expected: 0 (no policies = public access)

-- =====================================================
-- NEXT STEP (MANUAL):
-- =====================================================
-- 1. Go to Supabase Dashboard
-- 2. Storage → Buckets
-- 3. Click slideshow-videos settings
-- 4. Toggle "Public bucket" to ON
-- 5. Save
-- 
-- That's it! Videos are now public for everyone.
-- =====================================================

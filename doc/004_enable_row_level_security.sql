-- =====================================================
-- Migration: Enable Row Level Security (RLS)
-- Version: 004
-- Date: 2024-11-06
-- Description: Enable RLS and create security policies for all tables and storage buckets
-- =====================================================

-- Purpose:
-- This migration enables Row Level Security (RLS) on all tables and creates
-- appropriate policies to secure the application while maintaining functionality.

-- Security Model:
-- - Public (anon): Read-only access to non-hidden content
-- - Authenticated: Read access to all content
-- - Service Role: Full access (used by API routes)

-- Tables Affected:
-- - image_durations
-- - slideshow_settings

-- Storage Buckets Affected:
-- - slideshow-images
-- - slideshow-videos
-- =====================================================

-- =====================================================
-- PART 1: Enable RLS on Tables
-- =====================================================

-- Enable RLS on image_durations table
ALTER TABLE image_durations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on slideshow_settings table
ALTER TABLE slideshow_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Policies for image_durations Table
-- =====================================================

-- Policy 1: Allow public read access to non-hidden images
-- This is for the TV slideshow display (uses anon key)
CREATE POLICY "Public read non-hidden images"
  ON image_durations
  FOR SELECT
  TO anon
  USING (hidden = false);

-- Policy 2: Allow authenticated users to read all images
-- This is for logged-in admin users
CREATE POLICY "Authenticated read all images"
  ON image_durations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Allow service role full access
-- This is for server-side API operations (using service role key)
CREATE POLICY "Service role full access on image_durations"
  ON image_durations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 4: Deny all public writes
-- Prevent anonymous users from modifying data
CREATE POLICY "Deny public writes on image_durations"
  ON image_durations
  FOR INSERT
  TO anon
  USING (false);

CREATE POLICY "Deny public updates on image_durations"
  ON image_durations
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "Deny public deletes on image_durations"
  ON image_durations
  FOR DELETE
  TO anon
  USING (false);

-- =====================================================
-- PART 3: Policies for slideshow_settings Table
-- =====================================================

-- Policy 1: Allow public read access to settings
-- TV needs to read transition effects and other settings
CREATE POLICY "Public read settings"
  ON slideshow_settings
  FOR SELECT
  TO anon
  USING (true);

-- Policy 2: Allow authenticated users to read settings
CREATE POLICY "Authenticated read settings"
  ON slideshow_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Allow service role full access
CREATE POLICY "Service role full access on settings"
  ON slideshow_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 4: Deny all public writes
CREATE POLICY "Deny public writes on settings"
  ON slideshow_settings
  FOR INSERT
  TO anon
  USING (false);

CREATE POLICY "Deny public updates on settings"
  ON slideshow_settings
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "Deny public deletes on settings"
  ON slideshow_settings
  FOR DELETE
  TO anon
  USING (false);

-- =====================================================
-- PART 4: Storage Bucket Policies
-- =====================================================

-- NOTE: Storage bucket policies must be created in Supabase Dashboard
-- Go to: Storage > [bucket-name] > Policies
-- 
-- For slideshow-images bucket:
-- ================================

-- Policy 1: Public read access (for TV slideshow)
-- Name: "Public read access for slideshow"
-- Allowed operation: SELECT
-- Policy definition:
-- bucket_id = 'slideshow-images'

-- Policy 2: Service role full access
-- Name: "Service role full access"
-- Allowed operation: SELECT, INSERT, UPDATE, DELETE
-- Policy definition:
-- bucket_id = 'slideshow-images' AND auth.role() = 'service_role'

-- For slideshow-videos bucket:
-- ================================

-- Policy 1: Public read access (for TV slideshow)
-- Name: "Public read access for videos"
-- Allowed operation: SELECT
-- Policy definition:
-- bucket_id = 'slideshow-videos'

-- Policy 2: Service role full access
-- Name: "Service role full access"
-- Allowed operation: SELECT, INSERT, UPDATE, DELETE
-- Policy definition:
-- bucket_id = 'slideshow-videos' AND auth.role() = 'service_role'

-- =====================================================
-- PART 5: Verification Queries
-- =====================================================

-- Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('image_durations', 'slideshow_settings');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('image_durations', 'slideshow_settings')
ORDER BY tablename, policyname;

-- =====================================================
-- PART 6: Rollback Instructions (If Needed)
-- =====================================================

-- To disable RLS (NOT RECOMMENDED for production):
-- ALTER TABLE image_durations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE slideshow_settings DISABLE ROW LEVEL SECURITY;

-- To drop all policies:
-- DROP POLICY IF EXISTS "Public read non-hidden images" ON image_durations;
-- DROP POLICY IF EXISTS "Authenticated read all images" ON image_durations;
-- DROP POLICY IF EXISTS "Service role full access on image_durations" ON image_durations;
-- DROP POLICY IF EXISTS "Deny public writes on image_durations" ON image_durations;
-- DROP POLICY IF EXISTS "Deny public updates on image_durations" ON image_durations;
-- DROP POLICY IF EXISTS "Deny public deletes on image_durations" ON image_durations;
-- DROP POLICY IF EXISTS "Public read settings" ON slideshow_settings;
-- DROP POLICY IF EXISTS "Authenticated read settings" ON slideshow_settings;
-- DROP POLICY IF EXISTS "Service role full access on settings" ON slideshow_settings;
-- DROP POLICY IF EXISTS "Deny public writes on settings" ON slideshow_settings;
-- DROP POLICY IF EXISTS "Deny public updates on settings" ON slideshow_settings;
-- DROP POLICY IF EXISTS "Deny public deletes on settings" ON slideshow_settings;

-- =====================================================
-- NOTES
-- =====================================================

-- Security Considerations:
-- 1. Service role key bypasses ALL RLS policies - keep it secret and server-side only
-- 2. Anon key respects RLS policies - safe to use client-side
-- 3. Storage bucket policies are separate from table policies
-- 4. Always test policies after deployment with both anon and service role keys

-- Testing RLS Policies:
-- 1. Test with anon key (should only see non-hidden images)
-- 2. Test with service role key (should see everything)
-- 3. Try to insert/update/delete with anon key (should fail)
-- 4. Try to insert/update/delete with service role key (should succeed)

-- Maintenance:
-- - Review policies quarterly
-- - Monitor failed policy checks in Supabase logs
-- - Update policies when adding new features

COMMENT ON POLICY "Public read non-hidden images" ON image_durations IS 
  'Allows anonymous users (TV slideshow) to read non-hidden images only';

COMMENT ON POLICY "Service role full access on image_durations" ON image_durations IS 
  'Allows server-side API routes to perform all operations using service role key';

COMMENT ON POLICY "Public read settings" ON slideshow_settings IS 
  'Allows TV slideshow to read settings like transition effects';

COMMENT ON POLICY "Service role full access on settings" ON slideshow_settings IS 
  'Allows admin API to manage settings using service role key';

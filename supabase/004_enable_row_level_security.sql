-- =====================================================
-- CLEANUP: Drop Old Policies and Recreate
-- =====================================================
-- Run this script if you already ran the migration and need to fix it

-- Drop all existing policies on image_durations
DROP POLICY IF EXISTS "Public read non-hidden images" ON image_durations;
DROP POLICY IF EXISTS "Authenticated read all images" ON image_durations;
DROP POLICY IF EXISTS "Service role full access on image_durations" ON image_durations;
DROP POLICY IF EXISTS "Deny public writes on image_durations" ON image_durations;
DROP POLICY IF EXISTS "Deny public updates on image_durations" ON image_durations;
DROP POLICY IF EXISTS "Deny public deletes on image_durations" ON image_durations;

-- Drop all existing policies on slideshow_settings
DROP POLICY IF EXISTS "Public read settings" ON slideshow_settings;
DROP POLICY IF EXISTS "Authenticated read settings" ON slideshow_settings;
DROP POLICY IF EXISTS "Service role full access on settings" ON slideshow_settings;
DROP POLICY IF EXISTS "Deny public writes on settings" ON slideshow_settings;
DROP POLICY IF EXISTS "Deny public updates on settings" ON slideshow_settings;
DROP POLICY IF EXISTS "Deny public deletes on settings" ON slideshow_settings;

-- =====================================================
-- Recreate Correct Policies
-- =====================================================

-- =====================================================
-- PART 1: Policies for image_durations Table
-- =====================================================

-- Policy 1: Allow public read access to non-hidden images
CREATE POLICY "Public read non-hidden images"
  ON image_durations
  FOR SELECT
  TO anon
  USING (hidden = false);

-- Policy 2: Allow authenticated users to read all images
CREATE POLICY "Authenticated read all images"
  ON image_durations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Allow service role full access
CREATE POLICY "Service role full access on image_durations"
  ON image_durations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: No INSERT/UPDATE/DELETE policies for anon = blocked by default

-- =====================================================
-- PART 2: Policies for slideshow_settings Table
-- =====================================================

-- Policy 1: Allow public read access to settings
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

-- Note: No INSERT/UPDATE/DELETE policies for anon = blocked by default

-- =====================================================
-- Verification
-- =====================================================

-- Check policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('image_durations', 'slideshow_settings')
ORDER BY tablename, policyname;

-- Should see:
-- image_durations | Authenticated read all images | SELECT | {authenticated}
-- image_durations | Public read non-hidden images | SELECT | {anon}
-- image_durations | Service role full access on image_durations | ALL | {service_role}
-- slideshow_settings | Authenticated read settings | SELECT | {authenticated}
-- slideshow_settings | Public read settings | SELECT | {anon}
-- slideshow_settings | Service role full access on settings | ALL | {service_role}

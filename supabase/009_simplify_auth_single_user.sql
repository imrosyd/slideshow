-- =====================================================
-- Migration: Simplify Auth - Single User Only
-- Version: 009
-- Date: 2025-11-11
-- Description: Remove complex user management, support 1 admin user only
-- =====================================================

-- Purpose:
-- Maximize bandwidth savings by removing all user management overhead:
-- - No profiles table queries
-- - No access logging
-- - No permission checks
-- - Just simple: logged in = access granted

-- Step 1: Drop unnecessary tables
-- ----------------------------------------------------
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Remove access_level column (not needed)
-- ----------------------------------------------------
ALTER TABLE image_durations 
DROP COLUMN IF EXISTS access_level;

-- Step 3: Clean up unused indexes
-- ----------------------------------------------------
DROP INDEX IF EXISTS idx_image_durations_access_level;
DROP INDEX IF EXISTS idx_image_durations_is_video;

-- Step 4: DONE!
-- ----------------------------------------------------
-- Now you only need to:
-- 1. Create 1 user manually in Supabase Auth dashboard
-- 2. Use that email/password for both admin and remote pages
-- 3. No user management needed

-- =====================================================
-- How to Create Admin User:
-- =====================================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" or "Invite User"
-- 3. Enter email: your-admin@example.com
-- 4. Enter password: your-secure-password
-- 5. Click "Create User"
-- 6. Done! Use this email/password to login
-- 
-- This user can access:
-- - /admin (admin page)
-- - /remote (remote control page)
-- - Both use same login credentials
-- =====================================================

-- =====================================================
-- Verification:
-- =====================================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'access_logs');
-- Expected: 0 rows (tables removed)

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'image_durations' 
  AND column_name = 'access_level';
-- Expected: 0 rows (column removed)
-- =====================================================

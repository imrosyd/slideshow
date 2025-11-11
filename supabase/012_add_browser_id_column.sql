-- =====================================================
-- Migration: Add browser_id Column to Active Sessions  
-- Version: 012
-- Date: 2025-11-11
-- Description: Add browser_id column for browser-level session tracking
-- =====================================================

-- Purpose:
-- Enable tracking of individual browsers to allow same browser to have
-- multiple pages (admin and remote) while preventing different browsers
-- from accessing simultaneously

-- Step 1: Add browser_id column
-- ----------------------------------------------------
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS browser_id TEXT;

-- Step 2: Create index on browser_id for performance
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_active_sessions_browser_id 
ON active_sessions(browser_id);

-- Step 3: Update existing rows to have a temporary browser_id
-- ----------------------------------------------------
-- This ensures existing sessions don't break
UPDATE active_sessions 
SET browser_id = CONCAT('legacy-browser-', id::TEXT)
WHERE browser_id IS NULL;

-- =====================================================
-- Verification Query:
-- =====================================================
-- Check table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'active_sessions'
-- ORDER BY ordinal_position;

-- Check active sessions with browser IDs:
-- SELECT 
--   email,
--   page,
--   browser_id,
--   session_id,
--   last_seen
-- FROM active_sessions
-- ORDER BY last_seen DESC;
-- =====================================================

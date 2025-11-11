-- =====================================================
-- Migration: Add session_id Column to Active Sessions
-- Version: 011
-- Date: 2025-11-11
-- Description: Add session_id column for device-level session tracking
-- =====================================================

-- Purpose:
-- Enable tracking of individual browser/device sessions
-- This allows detecting when the same user opens multiple tabs/browsers
-- and enforces single concurrent session even for the same user

-- Step 1: Add session_id column
-- ----------------------------------------------------
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Step 2: Create index on session_id for performance
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id 
ON active_sessions(session_id);

-- Step 3: Update existing rows to have a temporary session_id
-- ----------------------------------------------------
-- This ensures existing sessions don't break
UPDATE active_sessions 
SET session_id = CONCAT('legacy-', id::TEXT)
WHERE session_id IS NULL;

-- Step 4: Make session_id NOT NULL after updating existing rows
-- ----------------------------------------------------
ALTER TABLE active_sessions 
ALTER COLUMN session_id SET NOT NULL;

-- Step 5: Add unique constraint on session_id
-- ----------------------------------------------------
-- Note: We don't add unique constraint because we want to check manually
-- Multiple rows with same session_id should not exist, but we handle it in code

-- =====================================================
-- Verification Query:
-- =====================================================
-- Check table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'active_sessions';
-- =====================================================

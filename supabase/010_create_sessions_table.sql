-- =====================================================
-- Migration: Create Active Sessions Table
-- Version: 010
-- Date: 2025-11-11
-- Description: Track active sessions for single concurrent user enforcement
-- =====================================================

-- Purpose:
-- Ensure only 1 user can be logged in at a time across admin & remote pages
-- - Track active sessions
-- - Auto-cleanup stale sessions
-- - Force logout capability

-- Step 1: Create active_sessions table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT NOT NULL CHECK (page IN ('admin', 'remote'))
);

-- Step 2: Create indexes for performance
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id 
ON active_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen 
ON active_sessions(last_seen);

-- Step 3: Add comment
-- ----------------------------------------------------
COMMENT ON TABLE active_sessions IS 'Tracks active user sessions to enforce single concurrent access';

-- =====================================================
-- Verification Query:
-- =====================================================
-- SELECT * FROM active_sessions;
-- Expected: 0 rows initially

-- Check table structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'active_sessions';
-- =====================================================

-- =====================================================
-- Cleanup Query (if needed):
-- =====================================================
-- Force clear all sessions:
-- DELETE FROM active_sessions;
-- =====================================================

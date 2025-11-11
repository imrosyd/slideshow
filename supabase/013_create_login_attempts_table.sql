-- =====================================================
-- Migration: Create Login Attempts Table
-- Version: 013
-- Date: 2025-11-11
-- Description: Track pending login attempts for cross-browser communication
-- =====================================================

-- Purpose:
-- Enable communication between browsers when a new login attempt occurs
-- Browser lama gets notified and can approve/deny the new login

-- Step 1: Create login_attempts table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  browser_id TEXT NOT NULL,
  browser_info TEXT, -- User agent info for display
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes')
);

-- Step 2: Create indexes for performance
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id 
ON login_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_login_attempts_status 
ON login_attempts(status);

CREATE INDEX IF NOT EXISTS idx_login_attempts_expires_at
ON login_attempts(expires_at);

-- Step 3: Add comment
-- ----------------------------------------------------
COMMENT ON TABLE login_attempts IS 'Tracks pending login attempts for user approval flow';

-- Step 4: Function to cleanup expired attempts
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_login_attempts()
RETURNS void AS $$
BEGIN
  UPDATE login_attempts 
  SET status = 'expired'
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Verification Query:
-- =====================================================
-- SELECT * FROM login_attempts;

-- Check pending attempts:
-- SELECT * FROM login_attempts 
-- WHERE status = 'pending' 
-- AND expires_at > NOW();
-- =====================================================

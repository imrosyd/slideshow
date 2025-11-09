-- =====================================================
-- Migration: Add is_video Column
-- Version: 005
-- Date: 2024-11-08
-- Description: Add is_video column to properly track video entries
-- =====================================================

-- Purpose:
-- This migration adds the is_video column to track which entries are videos
-- versus regular images. This column is referenced throughout the codebase
-- but may have been missing from initial setup.

-- Add is_video column if it doesn't exist
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT false;

-- Create index for video queries
CREATE INDEX IF NOT EXISTS idx_image_durations_is_video ON image_durations(is_video);

-- Add helpful comment
COMMENT ON COLUMN image_durations.is_video IS 'Whether this entry represents a video (true) or regular image (false)';

-- =====================================================
-- Verification Query:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'image_durations' 
-- AND table_schema = 'public';
-- =====================================================

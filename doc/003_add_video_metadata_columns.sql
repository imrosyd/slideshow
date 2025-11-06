-- =====================================================
-- Migration: Add Video Metadata Columns
-- Version: 003
-- Date: 2024-11-05
-- Description: Add columns for tracking generated videos
-- =====================================================

-- Purpose:
-- This migration adds columns to track video generation status,
-- URLs, and metadata for each image in the slideshow.

-- Tables Modified:
-- - image_durations: Add video-related columns

-- New Columns:
-- - video_url: Storage path to generated video file
-- - video_generated_at: Timestamp when video was created
-- - video_duration_seconds: Actual duration of generated video

-- Usage:
-- Run this SQL in Supabase SQL Editor AFTER running migrations 001 and 002.
-- This allows tracking which images have been converted to video format.
-- =====================================================

-- Add video metadata columns to image_durations table
ALTER TABLE image_durations
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_duration_seconds NUMERIC;

-- Create index for video queries
CREATE INDEX IF NOT EXISTS idx_image_durations_video_url ON image_durations(video_url);

-- Add helpful comments
COMMENT ON COLUMN image_durations.video_url IS 'Storage path to generated video file (null if not yet generated)';
COMMENT ON COLUMN image_durations.video_generated_at IS 'Timestamp when video was last generated';
COMMENT ON COLUMN image_durations.video_duration_seconds IS 'Actual duration of the generated video in seconds';

-- =====================================================
-- Usage Examples:
-- =====================================================
-- Check which images have generated videos:
-- SELECT filename, video_url, video_generated_at
-- FROM image_durations
-- WHERE video_url IS NOT NULL;

-- Find images that need video generation:
-- SELECT filename FROM image_durations WHERE video_url IS NULL;

-- Get total video count:
-- SELECT COUNT(*) as video_count FROM image_durations WHERE video_url IS NOT NULL;
-- =====================================================

-- =====================================================
-- Migration: Add Music Settings
-- Version: 004
-- Date: 2024-12-06
-- Description: Add background music settings for slideshow
-- =====================================================

-- Purpose:
-- This migration adds music settings to enable background music playback
-- in the slideshow with support for both uploaded files and external URLs

-- Settings Added:
-- - music_enabled: Boolean to enable/disable background music
-- - music_source_type: Type of music source ('upload', 'url', or 'youtube')
-- - music_file_url: URL of uploaded music file in Supabase storage
-- - music_external_url: External audio URL (direct MP3, WAV, etc.)
-- - music_youtube_url: YouTube video URL for background music
-- - music_volume: Volume level (0-100)
-- - music_loop: Whether to loop the music

-- Usage:
-- Run this SQL in Supabase SQL Editor after running previous migrations
-- =====================================================

-- Insert default music settings
INSERT INTO slideshow_settings (key, value)
VALUES 
  ('music_enabled', 'false'),
  ('music_source_type', 'upload'),
  ('music_file_url', ''),
  ('music_external_url', ''),
  ('music_youtube_url', ''),
  ('music_volume', '50'),
  ('music_loop', 'true')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Verification Query
-- =====================================================
-- SELECT * FROM slideshow_settings WHERE key LIKE 'music_%' ORDER BY key;

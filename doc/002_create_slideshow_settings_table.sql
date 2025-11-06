-- =====================================================
-- Migration: Create slideshow_settings Table
-- Version: 002
-- Date: 2024-11-04
-- Description: Create settings table for slideshow configuration
-- =====================================================

-- Purpose:
-- This migration creates a key-value table for storing global slideshow
-- settings such as transition effects, timing, and other configuration options.

-- Tables Created:
-- - slideshow_settings: Key-value store for slideshow configuration

-- Columns:
-- - id: Primary key
-- - key: Unique setting identifier (e.g., 'transition_effect')
-- - value: Setting value stored as text (JSON for complex values)
-- - created_at: Timestamp when setting was created
-- - updated_at: Timestamp when setting was last modified

-- Default Settings:
-- - transition_effect: 'fade' (default transition between images)

-- Usage:
-- Run this SQL in Supabase SQL Editor AFTER running 001_create_image_durations_table.sql
-- This migration depends on the update_updated_at_column() function from migration 001.
-- =====================================================

-- Create slideshow settings table (key-value store)
CREATE TABLE IF NOT EXISTS slideshow_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast settings lookup
CREATE INDEX IF NOT EXISTS idx_slideshow_settings_key ON slideshow_settings(key);

-- Insert default transition effect setting
INSERT INTO slideshow_settings (key, value)
VALUES ('transition_effect', 'fade')
ON CONFLICT (key) DO NOTHING;

-- Create trigger to automatically update updated_at on row changes
-- Note: Uses the update_updated_at_column() function created in migration 001
DROP TRIGGER IF EXISTS update_slideshow_settings_updated_at ON slideshow_settings;
CREATE TRIGGER update_slideshow_settings_updated_at
  BEFORE UPDATE ON slideshow_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments to table and columns
COMMENT ON TABLE slideshow_settings IS 'Key-value store for global slideshow configuration settings';
COMMENT ON COLUMN slideshow_settings.key IS 'Unique setting identifier (e.g., transition_effect, autoplay_enabled)';
COMMENT ON COLUMN slideshow_settings.value IS 'Setting value as text. Use JSON format for complex values';

-- =====================================================
-- Available Settings (for reference):
-- =====================================================
-- transition_effect: 'fade' | 'slide' | 'zoom'
--   - Controls the transition animation between images
-- Future settings can be added via INSERT or UPDATE:
-- INSERT INTO slideshow_settings (key, value)
-- VALUES ('autoplay_enabled', 'true')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- =====================================================




-- Insert default transition effect setting-- Insert default transition effect setting

INSERT INTO slideshow_settings (key, value)INSERT INTO slideshow_settings (key, value)
VALUES ('transition_effect', 'fade')VALUES ('transition_effect', 'fade')
ON CONFLICT (key) DO NOTHING;ON CONFLICT (key) DO NOTHING;



-- Create trigger to automatically update updated_at on row changes-- Create trigger to automatically update updated_at on row changes

-- Note: Uses the update_updated_at_column() function created in migration 001-- Note: Uses the update_updated_at_column() function created in migration 001

DROP TRIGGER IF EXISTS update_slideshow_settings_updated_at ON slideshow_settings;DROP TRIGGER IF EXISTS update_slideshow_settings_updated_at ON slideshow_settings;
CREATE TRIGGER update_slideshow_settings_updated_atCREATE TRIGGER update_slideshow_settings_updated_at
  BEFORE UPDATE ON slideshow_settings  BEFORE UPDATE ON slideshow_settings
  FOR EACH ROW  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();  EXECUTE FUNCTION update_updated_at_column();


-- Add helpful comments to table and columns-- Add helpful comments to table and columns

COMMENT ON TABLE slideshow_settings IS 'Key-value store for global slideshow configuration settings';COMMENT ON TABLE slideshow_settings IS 'Key-value store for global slideshow configuration settings';
COMMENT ON COLUMN slideshow_settings.key IS 'Unique setting identifier (e.g., transition_effect, autoplay_enabled)';COMMENT ON COLUMN slideshow_settings.key IS 'Unique setting identifier (e.g., transition_effect, autoplay_enabled)';
COMMENT ON COLUMN slideshow_settings.value IS 'Setting value as text. Use JSON format for complex values';COMMENT ON COLUMN slideshow_settings.value IS 'Setting value as text. Use JSON format for complex values';



-- =====================================================-- =====================================================
-- Available Settings (for reference):-- Available Settings (for reference):
-- =====================================================-- =====================================================
-- transition_effect: 'fade' | 'slide' | 'zoom'-- transition_effect: 'fade' | 'slide' | 'zoom'
--   - Controls the transition animation between images--   - Controls the transition animation between images
----
-- Future settings can be added via INSERT or UPDATE:-- Future settings can be added via INSERT or UPDATE:
-- INSERT INTO slideshow_settings (key, value) -- INSERT INTO slideshow_settings (key, value) 
-- VALUES ('autoplay_enabled', 'true')-- VALUES ('autoplay_enabled', 'true')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- =====================================================-- =====================================================


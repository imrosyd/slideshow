-- =====================================================
-- Migration: Create image_durations Table
-- Version: 001
-- Date: 2024-10-29
-- Description: Initial table creation for storing image metadata
-- =====================================================

-- Purpose:
-- This migration creates the main table for storing image durations,
-- captions, ordering, and visibility settings for the slideshow application.

-- Tables Created:
-- - image_durations: Stores metadata for each image in the slideshow

-- Columns:
-- - filename: Unique identifier for each image file
-- - duration_ms: Display duration in milliseconds
-- - caption: Optional text caption for the image
-- - order_index: Sorting order for slideshow sequence
-- - hidden: Toggle visibility in slideshow
-- - created_at: Timestamp when record was created
-- - updated_at: Timestamp when record was last modified

-- Usage:
-- Run this SQL in Supabase SQL Editor to create the initial table structure.
-- This should be executed FIRST before any other migrations.
-- =====================================================

-- Create main table for image durations and metadata
CREATE TABLE IF NOT EXISTS image_durations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  duration_ms INTEGER,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_image_durations_filename ON image_durations(filename);
CREATE INDEX IF NOT EXISTS idx_image_durations_order ON image_durations(order_index);
CREATE INDEX IF NOT EXISTS idx_image_durations_hidden ON image_durations(hidden);

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row changes
DROP TRIGGER IF EXISTS update_image_durations_updated_at ON image_durations;
CREATE TRIGGER update_image_durations_updated_at
  BEFORE UPDATE ON image_durations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment to table
COMMENT ON TABLE image_durations IS 'Stores metadata for slideshow images including duration, caption, order, and visibility';
COMMENT ON COLUMN image_durations.filename IS 'Unique filename of the image (must match file in Supabase Storage)';
COMMENT ON COLUMN image_durations.duration_ms IS 'Display duration in milliseconds (null = use default)';
COMMENT ON COLUMN image_durations.caption IS 'Optional caption text to display with the image';
COMMENT ON COLUMN image_durations.order_index IS 'Sort order for slideshow sequence (lower numbers appear first)';
COMMENT ON COLUMN image_durations.hidden IS 'If true, image will not appear in slideshow';



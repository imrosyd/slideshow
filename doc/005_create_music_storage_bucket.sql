-- =====================================================
-- Migration: Create Music Storage Bucket
-- Version: 005
-- Date: 2024-12-06
-- Description: Create Supabase storage bucket for background music files
-- =====================================================

-- Purpose:
-- This migration creates a storage bucket to store uploaded music files
-- for slideshow background music

-- Bucket Name: slideshow-music
-- Purpose: Store audio files (MP3, WAV, OGG, AAC)
-- Public: Yes (files need to be accessible by slideshow)

-- Usage:
-- Run this in Supabase Dashboard > Storage
-- OR use Supabase CLI/API to create the bucket programmatically
-- =====================================================

-- NOTE: Storage buckets are typically created via Supabase Dashboard UI or API
-- This file documents the required bucket configuration

-- Bucket Configuration:
-- Name: slideshow-music
-- Public: true (allow public access to files)
-- File Size Limit: 50 MB
-- Allowed MIME Types: audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/aac

-- To create via Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Click "New bucket"
-- 3. Set name to: slideshow-music
-- 4. Enable "Public bucket"
-- 5. Click "Save"

-- To create via SQL (if available):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'slideshow-music',
--   'slideshow-music',
--   true,
--   52428800, -- 50 MB in bytes
--   ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac']
-- );

-- Storage Policy (RLS):
-- Allow public read access to all files
-- Allow authenticated admins to upload/delete files

-- Public Read Policy:
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'slideshow-music');

-- Admin Upload Policy:
-- CREATE POLICY "Admin Upload"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'slideshow-music' AND auth.role() = 'authenticated');

-- Admin Delete Policy:
-- CREATE POLICY "Admin Delete"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'slideshow-music' AND auth.role() = 'authenticated');

-- =====================================================
-- Verification
-- =====================================================
-- Check if bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'slideshow-music';

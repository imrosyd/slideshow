-- =====================================================
-- COMPLETE SUPABASE MIGRATION FOR SLIDESHOW APP
-- Date: 2025-11-11
-- Description: All migrations in one file for easy setup
-- =====================================================

-- =====================================================
-- 1. CREATE IMAGE DURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS image_durations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  duration_ms INTEGER DEFAULT 5000,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_image_durations_filename ON image_durations(filename);
CREATE INDEX IF NOT EXISTS idx_image_durations_order ON image_durations(order_index);
CREATE INDEX IF NOT EXISTS idx_image_durations_hidden ON image_durations(hidden);

-- =====================================================
-- 2. CREATE SLIDESHOW SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS slideshow_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO slideshow_settings (key, value) 
VALUES 
  ('transition_type', 'fade'),
  ('transition_duration', '1000'),
  ('show_captions', 'true'),
  ('auto_play', 'true'),
  ('loop', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_slideshow_settings_key ON slideshow_settings(key);

-- =====================================================
-- 3. ADD VIDEO METADATA COLUMNS
-- =====================================================
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_duration_ms INTEGER;

ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'none';

-- Add check constraint for video status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_video_status'
  ) THEN
    ALTER TABLE image_durations 
    ADD CONSTRAINT valid_video_status 
    CHECK (video_status IN ('none', 'processing', 'ready', 'error'));
  END IF;
END $$;

-- =====================================================
-- 4. ADD IS_VIDEO COLUMN
-- =====================================================
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT FALSE;

-- Create index for video filtering
CREATE INDEX IF NOT EXISTS idx_image_durations_is_video 
ON image_durations(is_video);

-- =====================================================
-- 5. CREATE PROFILES TABLE (FOR AUTH)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- 6. CREATE ACTIVE SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT NOT NULL CHECK (page IN ('admin', 'remote')),
  session_id TEXT NOT NULL,
  browser_id TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_browser_id ON active_sessions(browser_id);

-- Add comment
COMMENT ON TABLE active_sessions IS 'Tracks active user sessions to enforce single concurrent access';

-- =====================================================
-- 7. CREATE LOGIN ATTEMPTS TABLE (Currently disabled/bug)
-- =====================================================
-- Note: This feature is currently disabled due to bugs
-- Keeping table for future implementation
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  browser_id TEXT NOT NULL,
  browser_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_status ON login_attempts(status);
CREATE INDEX IF NOT EXISTS idx_login_attempts_expires_at ON login_attempts(expires_at);

-- Add comment
COMMENT ON TABLE login_attempts IS 'Tracks pending login attempts for user approval flow (currently disabled)';

-- =====================================================
-- 8. STORAGE BUCKETS SETUP
-- =====================================================
-- Note: Run these in Supabase Dashboard -> Storage

-- Create buckets if not exists (run in Supabase Dashboard)
-- 1. slideshow-images (for images)
-- 2. slideshow-videos (for generated videos)

-- Make buckets public (run in Supabase Dashboard -> Storage -> Policies)
-- For slideshow-images:
-- - Allow public read access
-- - Allow authenticated write access

-- For slideshow-videos:
-- - Allow public read access
-- - Allow authenticated write access

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) SETTINGS
-- =====================================================
-- Disable RLS for internal tables (accessed via Service Role Key)
ALTER TABLE image_durations DISABLE ROW LEVEL SECURITY;
ALTER TABLE slideshow_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts DISABLE ROW LEVEL SECURITY;

-- Enable RLS for user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = id::text);

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to cleanup expired login attempts
CREATE OR REPLACE FUNCTION cleanup_expired_login_attempts()
RETURNS void AS $$
BEGIN
  UPDATE login_attempts 
  SET status = 'expired'
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM active_sessions 
  WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify everything is set up correctly:

-- Check all tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'image_durations', 
  'slideshow_settings', 
  'profiles', 
  'active_sessions', 
  'login_attempts'
);

-- Check image_durations structure:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'image_durations'
ORDER BY ordinal_position;

-- Check active sessions:
SELECT * FROM active_sessions;

-- Check settings:
SELECT * FROM slideshow_settings;

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Clear all sessions (force logout all users):
-- DELETE FROM active_sessions;

-- Clear expired login attempts:
-- SELECT cleanup_expired_login_attempts();

-- Clear stale sessions:
-- SELECT cleanup_stale_sessions();

-- Reset image order:
-- UPDATE image_durations SET order_index = 0;

-- Hide/show images:
-- UPDATE image_durations SET hidden = true WHERE filename = 'example.jpg';
-- UPDATE image_durations SET hidden = false WHERE filename = 'example.jpg';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- =====================================================
-- Migration: Create User Profiles Table
-- Version: 007
-- Date: 2024-11-11
-- Description: Create profiles table for user management and permissions
-- =====================================================

-- Drop table if exists (for development)
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  login_attempts INTEGER DEFAULT 0,
  last_access_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active);
CREATE INDEX idx_profiles_created_by ON profiles(created_by);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  );
  RETURN new;
END;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
BEGIN
  UPDATE public.profiles
  SET last_login = NOW(),
      last_access_at = NOW(),
      login_attempts = 0
  WHERE id = auth.uid();
  RETURN new;
END;

-- Update admin user profile if exists
UPDATE profiles 
SET 
  role = 'admin',
  permissions = ARRAY['admin_access', 'video_access', 'remote_control', 'upload_images', 'manage_videos']
WHERE email IN (
  SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'
);

-- =====================================================
-- Verification Query:
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND table_schema = 'public' 
-- ORDER BY ordinal_position;
-- =====================================================

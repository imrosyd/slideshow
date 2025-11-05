-- Add new columns to image_durations table
ALTER TABLE image_durations
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_image_durations_order ON image_durations(order_index);
CREATE INDEX IF NOT EXISTS idx_image_durations_hidden ON image_durations(hidden);

-- Create slideshow_settings table
CREATE TABLE IF NOT EXISTS slideshow_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for settings lookup
CREATE INDEX IF NOT EXISTS idx_slideshow_settings_key ON slideshow_settings(key);

-- Insert default transition effect setting
INSERT INTO slideshow_settings (key, value)
VALUES ('transition_effect', 'fade')
ON CONFLICT (key) DO NOTHING;

-- Create trigger to update updated_at on image_durations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_image_durations_updated_at ON image_durations;
CREATE TRIGGER update_image_durations_updated_at
  BEFORE UPDATE ON image_durations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slideshow_settings_updated_at ON slideshow_settings;
CREATE TRIGGER update_slideshow_settings_updated_at
  BEFORE UPDATE ON slideshow_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

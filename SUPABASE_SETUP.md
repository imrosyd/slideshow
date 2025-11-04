# Supabase Database Setup

## Required Table Structure

### `image_durations` table

Run this SQL in Supabase SQL Editor to ensure table is correctly set up:

```sql
-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.image_durations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 5000,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on filename (required for upsert to work)
ALTER TABLE public.image_durations 
  DROP CONSTRAINT IF EXISTS image_durations_filename_key;

ALTER TABLE public.image_durations 
  ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_image_durations_filename 
  ON public.image_durations(filename);

-- Enable Row Level Security (RLS)
ALTER TABLE public.image_durations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to do everything
CREATE POLICY IF NOT EXISTS "Service role can do everything" 
  ON public.image_durations 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create policy for anonymous read access (for slideshow display)
CREATE POLICY IF NOT EXISTS "Anyone can read" 
  ON public.image_durations 
  FOR SELECT 
  TO anon 
  USING (true);
```

## Verify Setup

Run this query to check existing data:

```sql
SELECT * FROM public.image_durations ORDER BY created_at DESC;
```

## Test Upsert Manually

```sql
-- Test insert
INSERT INTO public.image_durations (filename, duration_ms, caption)
VALUES ('test-image.jpg', 3000, 'Test caption')
ON CONFLICT (filename) 
DO UPDATE SET 
  duration_ms = EXCLUDED.duration_ms,
  caption = EXCLUDED.caption;

-- Verify
SELECT * FROM public.image_durations WHERE filename = 'test-image.jpg';
```

## Troubleshooting

### If upsert fails with "duplicate key" error:
1. Check if unique constraint exists:
   ```sql
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'image_durations';
   ```

2. If no unique constraint on filename, add it:
   ```sql
   ALTER TABLE public.image_durations 
     ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);
   ```

### If RLS blocks access:
1. Check policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'image_durations';
   ```

2. Temporarily disable RLS for testing (NOT for production):
   ```sql
   ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;
   ```

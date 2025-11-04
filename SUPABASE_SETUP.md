# Supabase Database Setup

## ⚠️ CRITICAL: This Must Be Done First!

The app is saving data successfully but **cannot read it back** due to Row Level Security (RLS) blocking reads.

## Quick Fix - Run This SQL Now

**Copy and paste this entire block into Supabase SQL Editor:**

```sql
-- 1. Create table with proper structure
CREATE TABLE IF NOT EXISTS public.image_durations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 5000,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add UNIQUE constraint (CRITICAL for upsert to work)
ALTER TABLE public.image_durations 
  DROP CONSTRAINT IF EXISTS image_durations_filename_key;

ALTER TABLE public.image_durations 
  ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_image_durations_filename 
  ON public.image_durations(filename);

-- 4. DISABLE RLS (service role should bypass, but sometimes doesn't work)
ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want RLS enabled, use these policies instead:
-- ALTER TABLE public.image_durations ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Service role full access" ON public.image_durations;
-- CREATE POLICY "Service role full access" 
--   ON public.image_durations 
--   FOR ALL 
--   TO service_role 
--   USING (true) 
--   WITH CHECK (true);
-- 
-- DROP POLICY IF EXISTS "Public read access" ON public.image_durations;
-- CREATE POLICY "Public read access" 
--   ON public.image_durations 
--   FOR SELECT 
--   USING (true);
```

## Verify It Worked

After running the SQL, check:

```sql
-- Should return rows if data was saved
SELECT * FROM public.image_durations ORDER BY created_at DESC;

-- Should show RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'image_durations';
-- rowsecurity should be 'false'
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

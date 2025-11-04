# Supabase Database Setup

## ⚠️ CRITICAL: Table Does Not Exist!

The `image_durations` table has not been created yet. Follow these steps:

## Step 1: Create the Table

**Open Supabase Dashboard → SQL Editor → New Query**

Copy and paste this ENTIRE script:

```sql
-- 1. CREATE THE TABLE
CREATE TABLE public.image_durations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 5000,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADD UNIQUE CONSTRAINT (required for upsert)
ALTER TABLE public.image_durations 
  ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);

-- 3. CREATE INDEX for better performance
CREATE INDEX idx_image_durations_filename 
  ON public.image_durations(filename);

-- 4. DISABLE RLS (so service role can read/write)
ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;

-- 5. VERIFY TABLE WAS CREATED
SELECT 
  tablename, 
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'image_durations';
```

Click **RUN** (or press Ctrl+Enter)

## Step 2: Verify Table Exists

Run this query:

```sql
-- Should show the table structure
\d public.image_durations

-- Or use this:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'image_durations' 
ORDER BY ordinal_position;
```

**Expected output:**
```
column_name   | data_type | is_nullable
--------------+-----------+-------------
id            | bigint    | NO
filename      | text      | NO
duration_ms   | integer   | NO
caption       | text      | YES
created_at    | timestamp | YES
```

## Step 3: Test Insert

Try inserting test data:

```sql
-- Insert test data
INSERT INTO public.image_durations (filename, duration_ms, caption)
VALUES ('test-image.png', 3000, 'Test Caption');

-- Check if it worked
SELECT * FROM public.image_durations;
```

**Should show:**
```
id | filename        | duration_ms | caption      | created_at
---+-----------------+-------------+--------------+------------------
1  | test-image.png  | 3000        | Test Caption | 2025-11-04 ...
```

## Step 4: Test Upsert (Update or Insert)

```sql
-- Try upserting (this is what the app does)
INSERT INTO public.image_durations (filename, duration_ms, caption)
VALUES ('test-image.png', 5000, 'Updated Caption')
ON CONFLICT (filename) 
DO UPDATE SET 
  duration_ms = EXCLUDED.duration_ms,
  caption = EXCLUDED.caption;

-- Check if it updated
SELECT * FROM public.image_durations WHERE filename = 'test-image.png';
```

**Should show updated values:**
```
duration_ms: 5000
caption: Updated Caption
```

## Step 5: Clean Up Test Data

```sql
-- Delete test data
DELETE FROM public.image_durations WHERE filename = 'test-image.png';
```

## After Creating the Table

1. Go back to your app's admin panel
2. Set duration for your images
3. Click "Save changes"
4. Refresh the page - durations should persist now!
5. Check slideshow - timer should work!

## Troubleshooting

### If table creation fails with "already exists":

```sql
-- Drop and recreate
DROP TABLE IF EXISTS public.image_durations CASCADE;

-- Then run the CREATE TABLE script again from Step 1
```

### If you see "permission denied":

Make sure you're logged in as the project owner in Supabase Dashboard.

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

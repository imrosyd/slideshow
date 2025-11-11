# 📋 Migration Order & Prerequisites

## ⚠️ IMPORTANT: Run Migrations in Order

Migrations **HARUS dijalankan berurutan** karena ada dependencies.

---

## 🔢 Migration Order (Old → New)

### Already Deployed (Probably):
1. ✅ `001_create_image_durations_table.sql` - Create base table
2. ✅ `003_add_video_metadata_columns.sql` - Add video_url, video_duration_seconds
3. ✅ `005_add_is_video_column.sql` - Add is_video column

**Check:** Kalau kamu sudah bisa upload video & lihat di admin page, berarti migrations ini sudah jalan.

---

## 🆕 New Migrations (For Bandwidth Optimization)

### For Public Video (Required):
**4. Migration 008: Make Videos Public**

**Choose ONE:**
- **Option A (Simple):** `008_make_videos_public_for_tv_SIMPLE.sql` ⭐ **RECOMMENDED**
- **Option B (Full):** `008_make_videos_public_for_tv.sql`

**Purpose:** Make videos accessible without authentication, enable 7-day caching

---

### For Simplified Auth (Optional but Recommended):
**5. Migration 009: Simplify Auth**

**File:** `009_simplify_auth_single_user.sql`

**Purpose:** Remove user management overhead, support 1 admin user only

---

## 🚨 If You Get Errors:

### Error: "column is_video does not exist"
**Problem:** Migration 005 hasn't been run yet

**Solution:**
```sql
-- Run this first in Supabase SQL Editor:
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_image_durations_is_video 
ON image_durations(is_video);
```

Then retry migration 008.

---

### Error: "column access_level does not exist"
**Problem:** Migration 006 hasn't been run (optional column)

**Solution:** 
- **Option 1:** Just skip it (access_level not critical for functionality)
- **Option 2:** Updated migrations now handle missing columns gracefully

---

### Error: "table profiles does not exist"
**Problem:** Migration 007 hasn't been run, but trying to run 009

**Solution:** 
- Migration 009 now uses `DROP TABLE IF EXISTS` - safe to run even if table doesn't exist
- Just run migration 009 as-is

---

## ✅ Recommended Quick Setup (Fresh Start)

If you're starting fresh or unsure which migrations ran:

### Step 1: Ensure Base Columns Exist
```sql
-- Run this to ensure all required columns exist:
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT false;

ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

CREATE INDEX IF NOT EXISTS idx_image_durations_is_video 
ON image_durations(is_video);
```

### Step 2: Make Videos Public
```sql
-- Run migration 008 SIMPLE version:
-- Copy-paste dari: 008_make_videos_public_for_tv_SIMPLE.sql
```

### Step 3: Set Bucket Public
- Supabase → Storage → `slideshow-videos` → Toggle "Public"

### Step 4: Simplify Auth (Optional)
```sql
-- Run migration 009:
-- Copy-paste dari: 009_simplify_auth_single_user.sql
```

### Step 5: Create Admin User
- Supabase → Authentication → Users → Add User

---

## 📊 Verification Queries

### Check if is_video column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'image_durations' 
AND column_name = 'is_video';
```
**Expected:** 1 row (is_video | boolean)

### Check if video policies exist:
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%video%';
```
**After migration 008:** Should see "Public can view videos" or no policies (if using SIMPLE)

### Check if tables were dropped:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'access_logs');
```
**After migration 009:** 0 rows (tables removed)

---

## 🆘 Emergency: Start Fresh

If migrations are too messy, you can start completely fresh:

```sql
-- DANGER: This drops everything. Only use if you're sure!
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;

-- Ensure image_durations has required columns
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT false;

ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

-- Drop all video policies
DROP POLICY IF EXISTS "Users can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;

-- Then set slideshow-videos bucket to PUBLIC in UI
```

---

**Last Updated:** 2025-11-11  
**Critical Migrations:** 008 (public videos), 009 (simplify auth)

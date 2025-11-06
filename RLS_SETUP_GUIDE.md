# 🔐 Row Level Security (RLS) Setup Guide

## Overview
File migration SQL untuk enable Row Level Security (RLS) telah dibuat di:
**`doc/004_enable_row_level_security.sql`**

## 📋 Langkah-Langkah Setup

### 1. Run Migration di Supabase Dashboard

1. Buka **Supabase Dashboard** → https://app.supabase.com
2. Pilih project Anda
3. Klik **SQL Editor** di menu kiri
4. Klik **New Query**
5. Copy-paste isi file `doc/004_enable_row_level_security.sql`
6. Klik **Run** atau tekan `Ctrl + Enter`

### 2. Setup Storage Bucket Policies (Manual)

Storage bucket policies **TIDAK BISA** dibuat via SQL, harus manual di Dashboard:

#### A. Bucket: `slideshow-images`

1. Go to: **Storage** → **slideshow-images** → **Policies**
2. Click **New Policy**

**Policy 1: Public Read Access**
```
Policy Name: Public read access for slideshow
Allowed operation: SELECT
Target roles: public

Policy definition:
bucket_id = 'slideshow-images'
```

**Policy 2: Service Role Full Access**
```
Policy Name: Service role full access
Allowed operation: ALL
Target roles: authenticated

Policy definition:
bucket_id = 'slideshow-images' AND auth.role() = 'service_role'
```

#### B. Bucket: `slideshow-videos`

1. Go to: **Storage** → **slideshow-videos** → **Policies**
2. Click **New Policy**

**Policy 1: Public Read Access**
```
Policy Name: Public read access for videos
Allowed operation: SELECT
Target roles: public

Policy definition:
bucket_id = 'slideshow-videos'
```

**Policy 2: Service Role Full Access**
```
Policy Name: Service role full access
Allowed operation: ALL
Target roles: authenticated

Policy definition:
bucket_id = 'slideshow-videos' AND auth.role() = 'service_role'
```

### 3. Verifikasi RLS Sudah Aktif

Jalankan query ini di SQL Editor:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('image_durations', 'slideshow_settings');

-- Should show rowsecurity = true for both tables
```

Expected output:
```
schemaname | tablename           | rowsecurity
-----------|--------------------|--------------
public     | image_durations    | true
public     | slideshow_settings | true
```

### 4. Test RLS Policies

#### Test dengan Anon Key (dari browser console):
```javascript
// Test read non-hidden images (should work)
const { data, error } = await supabase
  .from('image_durations')
  .select('*')
  .eq('hidden', false);

console.log('Anon read non-hidden:', data); // Should return data

// Test read hidden images (should return empty)
const { data: hiddenData } = await supabase
  .from('image_durations')
  .select('*')
  .eq('hidden', true);

console.log('Anon read hidden:', hiddenData); // Should return []

// Test write (should fail)
const { error: writeError } = await supabase
  .from('image_durations')
  .insert({ filename: 'test.jpg', duration_ms: 5000 });

console.log('Anon write error:', writeError); // Should have error
```

## 🔒 Security Model

### Table Policies

| Role | image_durations | slideshow_settings |
|------|----------------|-------------------|
| **anon** (public) | Read non-hidden only | Read all |
| **authenticated** | Read all | Read all |
| **service_role** | Full access (CRUD) | Full access (CRUD) |

### Storage Policies

| Role | slideshow-images | slideshow-videos |
|------|-----------------|------------------|
| **public** | Read all | Read all |
| **service_role** | Full access | Full access |

## 🚨 Important Notes

1. **Service Role Key Security**
   - Service role key bypasses ALL RLS policies
   - NEVER expose service role key client-side
   - Only use in API routes (server-side)

2. **Anon Key Safety**
   - Anon key respects RLS policies
   - Safe to use client-side (in browser)
   - Users can only do what policies allow

3. **Storage Bucket Policies**
   - Separate from table policies
   - Must be created manually in Dashboard
   - Public read needed for TV slideshow

4. **Testing Checklist**
   - ✅ Anon can read non-hidden images
   - ✅ Anon CANNOT read hidden images
   - ✅ Anon CANNOT write/update/delete
   - ✅ Service role can do everything
   - ✅ Storage buckets readable by public
   - ✅ Storage buckets writable by service role only

## 🔄 Rollback (If Needed)

If you need to disable RLS (NOT recommended):

```sql
-- Disable RLS
ALTER TABLE image_durations DISABLE ROW LEVEL SECURITY;
ALTER TABLE slideshow_settings DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Public read non-hidden images" ON image_durations;
DROP POLICY IF EXISTS "Authenticated read all images" ON image_durations;
-- ... (see migration file for complete rollback)
```

## 📝 Maintenance

- Review policies quarterly
- Monitor failed policy checks in Supabase logs
- Update policies when adding new features
- Test after every policy change

## ✅ Verification Checklist

Before marking this complete:

- [ ] Migration SQL executed successfully
- [ ] RLS enabled on `image_durations` table
- [ ] RLS enabled on `slideshow_settings` table
- [ ] Storage policies created for `slideshow-images`
- [ ] Storage policies created for `slideshow-videos`
- [ ] Tested anon read (non-hidden only)
- [ ] Tested anon write (should fail)
- [ ] Tested service role access (should work)
- [ ] TV slideshow still works (can load images/videos)
- [ ] Admin panel still works (can upload/delete)

## 🎯 Next Steps

After RLS is enabled:

1. **Monitor Logs**: Check Supabase logs for policy violations
2. **Update Docs**: Update README.md with RLS info
3. **Security Audit**: Verify no data leaks with anon key
4. **Performance Check**: Ensure RLS doesn't slow down queries

---

**Status:** ⚠️ PENDING - Migration SQL created, needs manual execution in Supabase Dashboard

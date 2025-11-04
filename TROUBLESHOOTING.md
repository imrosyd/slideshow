# Troubleshooting Guide - Duration Timer Issue

## Problem: Timer Duration Hilang/Tidak Tersimpan

### ✅ Checklist - Ikuti Urutan Ini

#### 1. Cek Environment Variables

Di file `.env.local` (local) dan Vercel Environment Variables (production), pastikan ada:

```bash
SUPABASE_DURATIONS_TABLE=image_durations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_STORAGE_BUCKET=slideshow-images
ADMIN_PASSWORD=your_password
```

**Test:** Lihat Vercel logs, jika ada error "SUPABASE_DURATIONS_TABLE is not set", berarti variable belum diset.

---

#### 2. Buat Tabel di Supabase

**Buka Supabase Dashboard → SQL Editor → New Query**

```sql
-- Buat tabel
CREATE TABLE public.image_durations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 5000,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tambah unique constraint
ALTER TABLE public.image_durations 
  ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);

-- Buat index
CREATE INDEX idx_image_durations_filename 
  ON public.image_durations(filename);

-- Disable RLS
ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;
```

**Verify:**
```sql
-- Harus muncul tabel
SELECT * FROM public.image_durations;

-- Harus muncul: rowsecurity = false
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'image_durations';
```

---

#### 3. Test Save di Admin Panel

1. Buka `/admin`
2. Login dengan `ADMIN_PASSWORD`
3. Set duration untuk 1 gambar (misalnya 3 detik)
4. Klik "Save changes"
5. **Lihat Vercel logs** untuk:
   ```
   [Metadata] Save completed successfully
   ```

**Jika ada error:**
```
[Metadata] Upsert error details: { ... }
```
Copy error tersebut dan cari solusinya di bawah.

---

#### 4. Verify Data Tersimpan di Supabase

**Jalankan query:**
```sql
SELECT * FROM public.image_durations ORDER BY created_at DESC;
```

**Harus muncul data seperti:**
```
id | filename        | duration_ms | caption | created_at
1  | OmniBoard1.png  | 3000        | null    | 2025-11-04 ...
```

**Jika tabel KOSONG:**
- Save gagal
- Lihat section "Common Errors" di bawah

---

#### 5. Test Read di Admin Panel

1. Refresh halaman `/admin`
2. Duration yang Anda set **harus tetap ada**
3. **Lihat Vercel logs:**
   ```
   [Admin Images] Metadata items found: 5
   [Admin Images] Images with duration: 5
   ```

**Jika "Images with duration: 0":**
- RLS masih blocking
- Jalankan: `ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;`

---

#### 6. Test Slideshow Timer

1. Buka halaman utama `/`
2. Console browser harus menunjukkan:
   ```
   [Slideshow] Duration data received: { "OmniBoard1.png": 3000 }
   [Slideshow] OmniBoard1.png: 3000ms -> 3s
   ```
3. Timer harus berjalan sesuai setting (3 detik, bukan 12 detik default)

---

## Common Errors & Solutions

### Error: "duplicate key value violates unique constraint"

**Penyebab:** Unique constraint belum ada atau salah setup

**Solusi:**
```sql
ALTER TABLE public.image_durations 
  DROP CONSTRAINT IF EXISTS image_durations_filename_key;
  
ALTER TABLE public.image_durations 
  ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);
```

---

### Error: "null value in column duration_ms violates not-null constraint"

**Penyebab:** Frontend mengirim `null` untuk duration_ms

**Solusi:** Sudah diperbaiki di commit terbaru dengan default 5000ms

**Verify:** Check `pages/api/admin/metadata.ts` line ~84:
```typescript
const DEFAULT_DURATION_MS = 5000;
duration_ms: item.durationMs ?? DEFAULT_DURATION_MS
```

---

### Error: "permission denied for table image_durations"

**Penyebab:** RLS policy blocking atau service role key salah

**Solusi 1 - Disable RLS:**
```sql
ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;
```

**Solusi 2 - Check Service Role Key:**
Di Vercel Environment Variables, pastikan `SUPABASE_SERVICE_ROLE_KEY` benar (bukan anon key!)

---

### Duration masih 12 detik di slideshow

**Penyebab:** Browser cache atau data belum ter-update

**Solusi:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Buka incognito/private window
4. Tunggu 60 detik (auto-refresh interval)

---

### Duration hilang setelah refresh admin

**Penyebab:** Data tidak tersimpan (query SELECT gagal)

**Debug:**
1. Cek Vercel logs untuk `[Admin Images]`
2. Lihat: `Metadata items found: X` dan `Images with duration: X`
3. Jika keduanya 0, berarti query gagal

**Solusi:**
```sql
-- Test manual query dengan service role
SELECT * FROM public.image_durations;

-- Jika error "permission denied", disable RLS:
ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;
```

---

## Quick Reset - Start Fresh

Jika semua sudah dicoba tapi masih bermasalah:

```sql
-- 1. Drop table
DROP TABLE IF EXISTS public.image_durations CASCADE;

-- 2. Recreate dari awal
CREATE TABLE public.image_durations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 5000,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.image_durations 
  ADD CONSTRAINT image_durations_filename_key UNIQUE (filename);

CREATE INDEX idx_image_durations_filename 
  ON public.image_durations(filename);

ALTER TABLE public.image_durations DISABLE ROW LEVEL SECURITY;

-- 3. Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'image_durations';
```

---

## Still Not Working?

Check Vercel logs untuk error messages:
1. Buka Vercel Dashboard
2. Pilih project → Logs
3. Filter untuk:
   - `[Metadata]` - untuk save operations
   - `[Images API]` - untuk read operations
   - `[Admin Images]` - untuk admin panel
4. Copy error message dan trace back ke code

Atau buka issue di GitHub dengan:
- Screenshot Vercel logs
- Screenshot Supabase table structure
- Browser console screenshot

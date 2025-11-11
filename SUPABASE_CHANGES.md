# 🔧 Perubahan Supabase yang Perlu Dilakukan

## ⚠️ PENTING: Cek Prerequisites Dulu!

Sebelum jalankan migration, pastikan column `is_video` sudah ada:

```sql
-- Run ini dulu untuk cek:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'image_durations' AND column_name = 'is_video';
```

**Kalau hasil 0 rows (column tidak ada):**
```sql
-- Jalankan ini dulu:
ALTER TABLE image_durations 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_image_durations_is_video 
ON image_durations(is_video);
```

Baru lanjut ke Step 1 di bawah.

---

## ✅ Checklist Perubahan

### 1. Jalankan Migration SQL (WAJIB)

**🎯 PILIH SALAH SATU:**

#### **Option A: Simple Version (RECOMMENDED)** ⭐
File: `/supabase/008_make_videos_public_for_tv_SIMPLE.sql`

Paling mudah, tidak ada policy yang rumit:
1. Buka Supabase Dashboard → SQL Editor
2. Klik "New Query"
3. Copy-paste isi file `008_make_videos_public_for_tv_SIMPLE.sql`
4. Klik "Run"
5. Done! Tidak ada error.

#### **Option B: Full Version (dengan admin policies)**
File: `/supabase/008_make_videos_public_for_tv.sql`

Kalau mau admin-only untuk upload/delete:
1. Buka Supabase Dashboard → SQL Editor
2. Klik "New Query"
3. Copy-paste isi file `008_make_videos_public_for_tv.sql`
4. Klik "Run"

**💡 Rekomendasi: Pakai Option A (Simple) dulu. Kalau ada masalah baru pakai Option B.**

---

### 2. Set Bucket `slideshow-videos` ke Public (WAJIB)

**Cara via Supabase Dashboard:**
1. Buka Supabase Dashboard
2. Pergi ke **Storage** → **Buckets**
3. Cari bucket `slideshow-videos`
4. Klik settings icon (⚙️) atau "..." menu
5. **Centang "Public bucket"** atau toggle ke ON
6. Klik "Save"

**Cara via SQL (Alternatif):**
```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'slideshow-videos';
```

---

### 3. Verifikasi Policies (Optional - untuk memastikan)

Jalankan query ini untuk cek policies sudah benar:

```sql
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%video%';
```

**Expected Result:**
| policyname | cmd | qual |
|-----------|-----|------|
| Public can view videos | SELECT | bucket_id = 'slideshow-videos' |
| Admins can manage videos | INSERT | bucket_id = 'slideshow-videos' AND admin |
| Admins can update videos | UPDATE | bucket_id = 'slideshow-videos' AND admin |
| Admins can delete videos | DELETE | bucket_id = 'slideshow-videos' AND admin |

---

### 4. Test Video Access (Optional - untuk memastikan)

Test apakah video bisa diakses public:

```bash
# Ganti dengan video URL actual dari bucket
curl -I https://[YOUR-SUPABASE-URL]/storage/v1/object/public/slideshow-videos/dashboard.jpg
```

**Expected:**
- Status: `200 OK` atau `307 Temporary Redirect`
- **BUKAN** `401 Unauthorized` atau `403 Forbidden`

---

## 🎯 Hasil Setelah Perubahan

### ✅ Yang Berubah:
- ✅ Video **TIDAK** perlu login lagi
- ✅ TV bisa putar 9 jam tanpa re-authentication
- ✅ Browser cache video selama 7 hari
- ✅ Bandwidth hemat: **50MB** untuk 9 jam (bukan 900MB)

### ✅ Yang TETAP Aman:
- ✅ Admin page tetap perlu login
- ✅ Upload/Delete video tetap admin-only
- ✅ Image gallery rate limiting tetap jalan (30 req/min)
- ✅ Bandwidth quota untuk visitor tetap enforce (50MB/hour)

---

## 📊 Estimasi Bandwidth Usage

**Sebelum (dengan auth):**
- Video 50MB × 18 refresh (setiap 30 menit) = **~900MB**

**Sesudah (public + cache):**
- Video 50MB × 1 download + overhead 500KB = **~50MB**

**Penghematan: 95%** 🎉

---

## 🚨 Troubleshooting

### Error SQL: "only WITH CHECK expression allowed for INSERT"?
**Solusi:** Pakai Simple Version (`008_make_videos_public_for_tv_SIMPLE.sql`) yang tidak ada policy INSERT.

### Video masih 401 Unauthorized?
1. Cek apakah migration 008 sudah dijalankan
2. Pastikan bucket `slideshow-videos` sudah **public = true**
3. Cek policies dengan query: `SELECT * FROM pg_policies WHERE tablename = 'objects' AND qual LIKE '%slideshow-videos%';`
4. Kalau masih ada policy yang block, drop manual: `DROP POLICY IF EXISTS "nama_policy" ON storage.objects;`
5. Clear browser cache dan coba lagi

### Video tidak muncul di TV?
1. Refresh halaman slideshow (F5)
2. Cek console browser untuk error
3. Pastikan video file ada di bucket
4. Test video URL langsung di browser: `https://[SUPABASE-URL]/storage/v1/object/public/slideshow-videos/[filename]`

### Bandwidth masih tinggi?
1. Cek browser cache behavior di DevTools → Network
2. Pastikan response header ada: `Cache-Control: public, max-age=604800`
3. Video harus cached (status 304 Not Modified), bukan re-download setiap loop
4. Kalau status 200 terus = cache tidak bekerja, coba hard refresh (Ctrl+Shift+R)

### Login Admin & Remote Control
Admin dan remote control **SUDAH MENGGUNAKAN LOGIN YANG SAMA**.
- Buat user dengan role 'admin' di Supabase Auth
- Login sekali bisa akses admin page DAN remote control page
- Tidak perlu buat account terpisah

---

## 📞 Need Help?

Kalau ada masalah, cek:
1. Supabase Logs → Storage logs
2. Browser DevTools → Console & Network tab
3. Vercel deployment logs

---

---

## 🆕 UPDATE: Simplified Authentication (Migration 009)

Untuk hemat bandwidth lebih lanjut, sekarang pakai **1 admin user** saja:

### Jalankan Migration 009:
```sql
-- Di Supabase SQL Editor:
-- File: supabase/009_simplify_auth_single_user.sql

DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
ALTER TABLE image_durations DROP COLUMN IF EXISTS access_level;
```

### Create 1 Admin User:
1. Supabase Dashboard → Authentication → Users
2. Add User: `admin@yourdomain.com` + password
3. Login dengan credentials ini untuk admin & remote page

**Detail lengkap:** Lihat file `SIMPLE_AUTH_GUIDE.md`

---

**Last Updated:** 2025-11-11  
**Migration Version:** 009 (Latest)

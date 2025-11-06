# Supabase Migrations

## Database Migrations

Jalankan migration ini secara berurutan di Supabase Dashboard → SQL Editor:

### 1. `001_create_image_durations_table.sql`
Membuat tabel `image_durations` untuk menyimpan metadata gambar (duration, caption, order, hidden).

### 2. `002_create_slideshow_settings_table.sql`
Membuat tabel `slideshow_settings` untuk menyimpan pengaturan slideshow (transition effect, dll).

### 3. `003_add_video_metadata_columns.sql`
Menambahkan kolom untuk metadata video (video_url, video_duration, video_generated_at).

### 4. `004_enable_row_level_security.sql`
Enable Row Level Security (RLS) dan membuat policies untuk keamanan database.

**⚠️ PENTING:** Jalankan migration ini untuk production deployment!

## Testing RLS

Setelah menjalankan migration 004, test dengan membuka file `test-rls.html` di browser untuk memverifikasi RLS bekerja dengan benar.

## Storage Buckets

Buat bucket di Supabase Dashboard → Storage:

1. **slideshow-images** - Untuk menyimpan gambar
2. **slideshow-videos** - Untuk menyimpan video hasil generate

### Storage Policies (Manual Setup)

Policies untuk storage bucket harus dibuat manual di Dashboard:

**slideshow-images policies:**
- Public read access: `bucket_id = 'slideshow-images'`
- Service role full access: `bucket_id = 'slideshow-images' AND auth.role() = 'service_role'`

**slideshow-videos policies:**
- Public read access: `bucket_id = 'slideshow-videos'`
- Service role full access: `bucket_id = 'slideshow-videos' AND auth.role() = 'service_role'`

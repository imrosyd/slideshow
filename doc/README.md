# Database Documentation# Database Migrations



Dokumentasi lengkap untuk setup database Supabase dan migration scripts.This directory contains SQL migration scripts for the Supabase database schema.



## File SQL Migrations## Migration Files



| File | Version | Description | Status || File | Version | Description | Status |

|------|---------|-------------|--------||------|---------|-------------|--------|

| `001_create_image_durations_table.sql` | 001 | Creates main `image_durations` table | ✅ Applied || `001_create_image_durations_table.sql` | 001 | Creates main `image_durations` table | ✅ Applied |

| `002_create_slideshow_settings_table.sql` | 002 | Creates `slideshow_settings` table | ✅ Applied || `002_create_slideshow_settings_table.sql` | 002 | Creates `slideshow_settings` table | ✅ Applied |

| `003_add_video_metadata_columns.sql` | 003 | Adds video tracking columns | ✅ Applied || `003_add_video_metadata_columns.sql` | 003 | Adds video tracking columns | ✅ Applied |



## Cara Apply Migrations## How to Apply Migrations



### Prerequisites### Prerequisites

- Akses ke Supabase Dashboard- Access to Supabase Dashboard

- Project dengan SQL Editor- Project with SQL Editor access



### Langkah-langkah### Steps to Apply



1. **Login ke Supabase Dashboard**1. **Login to Supabase Dashboard**

   - Buka https://supabase.com/dashboard   - Navigate to your project at https://supabase.com/dashboard

   - Pilih project Anda

2. **Open SQL Editor**

2. **Buka SQL Editor**   - Click on "SQL Editor" in the left sidebar

   - Klik "SQL Editor" di sidebar kiri   - Click "New query"

   - Klik "New query"

3. **Run Migrations in Order**

3. **Jalankan Migrations Sesuai Urutan**   - Copy the content of migration file (starting from `001_`)

   - Copy isi file migration (mulai dari `001_`)   - Paste into SQL Editor

   - Paste ke SQL Editor   - Click "Run" or press `Ctrl+Enter`

   - Klik "Run" atau tekan `Ctrl+Enter`   - Verify success message

   - Tunggu hingga sukses   - Repeat for next migration file

   - Ulangi untuk file migration berikutnya

4. **Verify Tables Created**

4. **Verifikasi Table Sudah Dibuat**   ```sql

   ```sql   -- Check if tables exist

   -- Cek apakah table sudah ada   SELECT table_name 

   SELECT table_name    FROM information_schema.tables 

   FROM information_schema.tables    WHERE table_schema = 'public' 

   WHERE table_schema = 'public'    AND table_name IN ('image_durations', 'slideshow_settings');

   AND table_name IN ('image_durations', 'slideshow_settings');   

      -- Check columns in image_durations

   -- Cek kolom di image_durations   SELECT column_name, data_type 

   SELECT column_name, data_type    FROM information_schema.columns 

   FROM information_schema.columns    WHERE table_name = 'image_durations';

   WHERE table_name = 'image_durations';   ```

   ```

## Migration Order

## Urutan Migration

**IMPORTANT:** Always run migrations in numerical order:

**PENTING:** Selalu jalankan migration sesuai urutan:1. `001_create_image_durations_table.sql` - Creates base table and trigger function

1. `001_create_image_durations_table.sql` - Membuat table utama dan trigger function2. `002_create_slideshow_settings_table.sql` - Depends on trigger function from 001

2. `002_create_slideshow_settings_table.sql` - Bergantung pada trigger function dari 0013. `003_add_video_metadata_columns.sql` - Adds columns to existing table

3. `003_add_video_metadata_columns.sql` - Menambahkan kolom ke table yang sudah ada

## Database Schema

## Database Schema

### Table: `image_durations`

### Table: `image_durations`

Stores metadata for each image in the slideshow.

Menyimpan metadata untuk setiap gambar di slideshow.

| Column | Type | Description |

| Kolom | Tipe | Deskripsi ||--------|------|-------------|

|-------|------|-----------|| `id` | SERIAL | Primary key |

| `id` | SERIAL | Primary key || `filename` | VARCHAR(255) | Unique image filename |

| `filename` | VARCHAR(255) | Nama file gambar (unik) || `duration_ms` | INTEGER | Display duration (milliseconds) |

| `duration_ms` | INTEGER | Durasi tampil (milidetik) || `caption` | TEXT | Optional image caption |

| `caption` | TEXT | Caption gambar (opsional) || `order_index` | INTEGER | Sort order (lower = first) |

| `order_index` | INTEGER | Urutan (angka kecil = pertama) || `hidden` | BOOLEAN | Hide from slideshow if true |

| `hidden` | BOOLEAN | Sembunyikan dari slideshow || `video_url` | TEXT | Path to generated video |

| `video_url` | TEXT | Path ke video yang di-generate || `video_generated_at` | TIMESTAMP | Video creation time |

| `video_generated_at` | TIMESTAMP | Waktu video dibuat || `video_duration_seconds` | NUMERIC | Video duration |

| `video_duration_seconds` | NUMERIC | Durasi video || `created_at` | TIMESTAMP | Record creation time |

| `created_at` | TIMESTAMP | Waktu record dibuat || `updated_at` | TIMESTAMP | Last update time |

| `updated_at` | TIMESTAMP | Waktu update terakhir |

**Indexes:**

**Indexes:**- `idx_image_durations_filename` - Fast filename lookup

- `idx_image_durations_filename` - Lookup cepat by filename- `idx_image_durations_order` - Sorting optimization

- `idx_image_durations_order` - Optimasi sorting- `idx_image_durations_hidden` - Filter hidden images

- `idx_image_durations_hidden` - Filter gambar tersembunyi- `idx_image_durations_video_url` - Video queries

- `idx_image_durations_video_url` - Query video

### Table: `slideshow_settings`

### Table: `slideshow_settings`

Key-value store for global slideshow configuration.

Key-value store untuk konfigurasi slideshow global.

| Column | Type | Description |

| Kolom | Tipe | Deskripsi ||--------|------|-------------|

|-------|------|-----------|| `id` | SERIAL | Primary key |

| `id` | SERIAL | Primary key || `key` | VARCHAR(255) | Unique setting name |

| `key` | VARCHAR(255) | Nama setting (unik) || `value` | TEXT | Setting value (JSON for complex) |

| `value` | TEXT | Nilai setting (JSON untuk complex) || `created_at` | TIMESTAMP | Record creation time |

| `created_at` | TIMESTAMP | Waktu record dibuat || `updated_at` | TIMESTAMP | Last update time |

| `updated_at` | TIMESTAMP | Waktu update terakhir |

**Indexes:**

**Indexes:**- `idx_slideshow_settings_key` - Fast setting lookup

- `idx_slideshow_settings_key` - Lookup cepat setting

**Default Settings:**

**Default Settings:**- `transition_effect`: `"fade"` - Transition animation type

- `transition_effect`: `"fade"` - Jenis animasi transisi

## Triggers

## Triggers

### `update_updated_at_column()`

### `update_updated_at_column()`- Automatically updates `updated_at` timestamp on row modification

- Otomatis update timestamp `updated_at` saat row berubah- Applied to both `image_durations` and `slideshow_settings` tables

- Diterapkan pada table `image_durations` dan `slideshow_settings`

## Rollback

## Rollback

To remove all tables and start fresh:

Untuk menghapus semua table dan mulai dari awal:

```sql

```sql-- ⚠️ WARNING: This will delete all data!

-- ⚠️ WARNING: Ini akan menghapus semua data!DROP TABLE IF EXISTS slideshow_settings CASCADE;

DROP TABLE IF EXISTS slideshow_settings CASCADE;DROP TABLE IF EXISTS image_durations CASCADE;

DROP TABLE IF EXISTS image_durations CASCADE;DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;```

```

Then re-run migrations from `001_` onwards.

Kemudian jalankan ulang migrations dari `001_` ke atas.

## Best Practices

## Best Practices

1. **Never modify existing migration files** - Create new migration files instead

1. **Jangan modifikasi file migration yang sudah ada** - Buat file migration baru2. **Always test in development first** - Never run untested migrations in production

2. **Selalu test di development dulu** - Jangan langsung di production3. **Backup before major changes** - Use Supabase backup feature

3. **Backup sebelum perubahan besar** - Gunakan fitur backup Supabase4. **Document all changes** - Add comments explaining why changes were made

4. **Dokumentasikan semua perubahan** - Tambahkan komentar yang jelas

## Creating New Migrations

## Membuat Migration Baru

When creating a new migration:

Format untuk migration baru:

1. **Use sequential numbering**: `00X_descriptive_name.sql`

1. **Gunakan numbering berurutan**: `00X_nama_deskriptif.sql`2. **Add header documentation** with purpose and usage

2. **Tambahkan header dokumentasi** dengan purpose dan usage3. **Use IF NOT EXISTS** to make migrations idempotent

3. **Gunakan IF NOT EXISTS** agar migration idempotent4. **Add helpful comments** to tables and columns

4. **Tambahkan komentar** ke table dan kolom5. **Test thoroughly** before applying to production

5. **Test menyeluruh** sebelum apply ke production

Example template:

Template contoh:```sql

```sql-- =====================================================

-- =====================================================-- Migration: Your Migration Title

-- Migration: Judul Migration Anda-- Version: 00X

-- Version: 00X-- Date: YYYY-MM-DD

-- Date: YYYY-MM-DD-- Description: What this migration does

-- Description: Apa yang dilakukan migration ini-- =====================================================

-- =====================================================-- [Your SQL here]

-- [SQL Anda di sini]```

```

## Support

## Support

For issues or questions about migrations:

Untuk pertanyaan atau masalah:- Check Supabase documentation: https://supabase.com/docs/guides/database

- Dokumentasi Supabase: https://supabase.com/docs/guides/database- Review migration comments for usage examples

- Review komentar di file migration untuk contoh usage- Test in local development environment first

- Test di local development environment dulu

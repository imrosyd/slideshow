# 🎞️ Slideshow Dashboard System

**Solusi digital signage all-in-one untuk Smart TV dan display monitor.**  
Dashboard slideshow profesional untuk TV/Display dengan admin panel intuitif, penyimpanan di Supabase, konversi otomatis gambar/PDF menjadi video, dan optimisasi webOS agar layar tetap menyala selama pemutaran.

> **Last Updated**: November 6, 2025 | **Version**: v1.2.0 | **Status**: ✅ Production Ready

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/) 
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)

## 🎯 Apa itu Slideshow?

Slideshow adalah aplikasi **Next.js 14 + TypeScript** yang dirancang khusus untuk menampilkan rotasi konten visual di layar TV secara terus‑menerus tanpa gangguan. Admin dapat mengunggah gambar/PDF, mengatur durasi tampil per slide, urutan, dan caption melalui panel yang user-friendly. Sistem otomatis mengonversi konten menjadi video MP4 yang dioptimalkan untuk playback lancar di perangkat webOS (khususnya LG TV), dilengkapi mekanisme keep-awake agresif dan loop native agar layar tidak sleep.

## ✨ Fitur

### 🗂️ Manajemen Konten (Admin)
- ✅ Upload banyak file sekaligus (gambar/PDF) ke Supabase Storage
- ✅ Rename file, ubah durasi tampil, caption, urutan, dan visibilitas (hidden)
- ✅ Generate video MP4 dari gambar/PDF (libx264, yuv420p, optimized for webOS)
- ✅ Hapus file beserta metadata terkait
- ✅ Drag & drop reordering, real-time preview

### 📺 Pemutar Slideshow (Display/TV)
- ✅ Pemutaran video secara loop tanpa jeda dengan retry/backoff
- ✅ Keep‑awake agresif (Wake Lock API, event video, dan webOS API)
- ✅ Optimisasi webOS: throttled triggers dan native loop
- ✅ Auto refresh konten berkala
- ✅ Smooth transitions dengan prefetch next slide

### 🧰 Infrastruktur
- ✅ Supabase Storage: `slideshow-images` dan `slideshow-videos`
- ✅ Database: tabel `image_durations` dan `slideshow_settings`
- ✅ Row Level Security (RLS) untuk keamanan data produksi
- ✅ API server-side memakai Service Role Key (tidak terekspos ke client)
- ✅ Configurable FFmpeg encoding via database settings

### 🔐 Keamanan
- ✅ Cookie HttpOnly untuk sesi admin
- ✅ Header keamanan (HSTS, X-Frame-Options, CSP, dll.)
- ✅ Sanitasi nama file dan batas ukuran upload
- ✅ RLS policies untuk akses terkontrol (enabled via migration)
- ✅ Service Role Key untuk backend operations (tidak terekspos ke client)

## 🧱 Tech Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (Node.js/Vercel compatible)
- **Database & Storage**: Supabase (PostgreSQL + Object Storage)
- **Video Processing**: FFmpeg via `@ffmpeg-installer/ffmpeg`
- **PDF Rendering**: pdf.js (client-side)
- **UI Components**: Headless, fully custom Tailwind CSS

## 🛠️ Instalasi

### 1️⃣ Clone & Masuk Folder

```bash
git clone https://github.com/imrosyd/slideshow.git
cd slideshow
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Konfigurasi Environment

Buat file `.env.local` di root proyek:

```bash
# Admin panel
ADMIN_PASSWORD=your_secure_password

# Supabase (public - aman di client)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Supabase (server only - JANGAN diekspos ke client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Storage & DB (optional, defaults bekerja untuk setup standar)
SUPABASE_STORAGE_BUCKET=slideshow-images
SUPABASE_DURATIONS_TABLE=image_durations
```

## 🗄️ Setup Supabase

### 1. Buat Storage Buckets

Di Supabase Dashboard → Storage, buat dua buckets:
- `slideshow-images` (untuk gambar/PDF)
- `slideshow-videos` (untuk video hasil generate)

### 2. Jalankan Database Migrations

Masuk ke Supabase Dashboard → SQL Editor, jalankan secara berurutan:

1. `supabase/001_create_image_durations_table.sql`
2. `supabase/002_create_slideshow_settings_table.sql`
3. `supabase/003_add_video_metadata_columns.sql`
4. `supabase/004_enable_row_level_security.sql` (ENABLE RLS + policies)

### 3. Konfigurasi Storage Policies

Di Dashboard → Storage → [bucket name] → Policies, buat:

**slideshow-images**:
- ✅ Public SELECT (anon can read)
- ✅ Service role ALL (for admin operations)

**slideshow-videos**:
- ✅ Public SELECT (anon can read)
- ✅ Service role ALL (for admin operations)

### ⚙️ Opsi Encoding Video (Opsional)

Atur parameter encoding FFmpeg melalui tabel `slideshow_settings` tanpa rebuild. Server memvalidasi nilai dan jatuh ke default jika invalid.

| Key | Default | Range | Deskripsi |
|-----|---------|-------|-----------|
| `video_crf` | `22` | 15–35 | Kualitas (lebih kecil = lebih bagus/lebih besar file) |
| `video_preset` | `veryfast` | ultrafast…veryslow | Kecepatan encoding |
| `video_profile` | `high` | baseline, main, high | H.264 profile |
| `video_level` | `4.0` | 3.1, 4.0, 4.2, … | H.264 level |
| `video_fps` | `24` | 15–60 | Frame per second |
| `video_gop` | `48` | fps … fps×10 | Keyframe interval (default 2×fps) |
| `video_width` | `1920` | 320–3840 | Output width (scale+pad maintains aspect ratio) |
| `video_height` | `1080` | 240–2160 | Output height (scale+pad maintains aspect ratio) |

**Default values** aman untuk webOS TV playback.  
**Catatan**: Scale akan selalu menjaga rasio aspek (scale+pad) dan output selalu yuv420p untuk kompatibilitas luas.

## 🔒 Testing RLS

Gunakan alat uji yang sudah disertakan:

1. Buka file `test-rls.html` di browser
2. Isi Supabase URL dan Anon Key
3. Klik "Initialize" lalu "Run All Tests"
4. Semua tes harus **PASS** (anon hanya bisa membaca konten non‑hidden)

## 💡 Cara Menjalankan

### Development

```bash
npm run dev
# Buka: http://localhost:3000 (atau 3001 jika 3000 sedang dipakai)
```

Halaman penting:
- **`/admin`** — panel admin (login dengan `ADMIN_PASSWORD`)
- **`/`** — pemutar slideshow untuk TV
- **`/remote`** — remote control page (optional)

Untuk debugging, cek **browser console** dan **server logs** di terminal.

### Production Build

```bash
npm run build
npm start
```

## 🚀 Deploy ke Vercel

### 1. Push ke GitHub

```bash
git add .
git commit -m "v1.2.0: FFmpeg fixes and configurable encoding"
git push origin main
```

### 2. Hubungkan ke Vercel

1. Masuk ke [vercel.com](https://vercel.com) → Import Project
2. Pilih repository `slideshow`
3. Set Environment Variables:
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**

### 3. Verifikasi Database

Pastikan semua SQL migrations (bagian Setup Supabase) sudah dijalankan di Supabase project.

## 📁 Struktur Direktori

```
slideshow/
├── components/
│   └── admin/
│       ├── UploadBox.tsx
│       ├── ImageCard.tsx
│       ├── ConfirmModal.tsx
│       ├── BatchVideoDialog.tsx
│       └── ToastProvider.tsx
├── hooks/
│   ├── useImages.ts
│   └── useToast.ts
├── lib/
│   ├── auth.ts
│   ├── supabase.ts
│   ├── constants.ts
│   └── webos.ts
├── pages/
│   ├── index.tsx                    # Pemutar slideshow (TV)
│   ├── admin.tsx                    # Panel admin
│   ├── login.tsx                    # Login page
│   └── api/
│       ├── admin/
│       │   ├── generate-video.ts    # FFmpeg video generation
│       │   ├── metadata.ts
│       │   ├── images.ts
│       │   ├── cleanup-videos.ts
│       │   └── ...
│       ├── settings.ts
│       └── ...
├── supabase/                        # SQL migrations
│   ├── 001_create_image_durations_table.sql
│   ├── 002_create_slideshow_settings_table.sql
│   ├── 003_add_video_metadata_columns.sql
│   └── 004_enable_row_level_security.sql
├── public/
├── styles/
├── test-rls.html                    # RLS testing tool
├── next.config.js
├── tsconfig.json
└── package.json
```

## 🧪 Scripts yang Tersedia

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Start dev server (Next.js) pada port 3000/3001 |
| `npm run build` | Build production (static + server) |
| `npm start` | Run production server |
| `npm run lint` | Jalankan ESLint & TypeScript check |

## 🧰 Troubleshooting

### Admin Panel

| Masalah | Solusi |
|--------|--------|
| **401 saat akses `/admin`** | Cek `ADMIN_PASSWORD` di `.env.local` |
| **403 saat upload ke Storage** | Cek Storage Policies sudah dibuat dengan benar |
| **Anon user bisa menulis data** | Pastikan RLS migration `004` sudah dijalankan |
| **Canvas2D warning di console (PDF)** | Fixed di v1.2 — upgrade ke versi terbaru |
| **Video generation error 500** | Lihat bagian "Video Generation" di bawah |

### Video Generation

| Masalah | Solusi |
|--------|--------|
| **Error 500 saat generate video** | • Durasi harus ≥ 1 detik per slide (auto-clamp)<br/>• Cek FFmpeg binary tersedia (dev: ada, Vercel: pastikan environment ok) |
| **Video tidak muncul di admin** | • Refresh page<br/>• Cek browser console untuk error<br/>• Cek Storage bucket `slideshow-videos` ada |
| **Durasi video salah** | • Check image metadata di database (duration_ms)<br/>• Server log: `[Video Gen] Effective total duration: ...` |
| **File size besar/kecil tidak expected** | • Tune via `video_crf` (default 22)<br/>• CRF 18 = lebih bagus, lebih besar<br/>• CRF 28 = lebih kecil, kurang bagus |

### TV Playback

| Masalah | Solusi |
|--------|--------|
| **Layar TV sleep/blank** | • Video harus H.264/yuv420p (default ok)<br/>• Koneksi stabil, pastikan buffer.<br/>• Check keep-awake mekanisme di logs |
| **Video tidak play di TV** | • Verify video format: `ffmpeg -i [file]`<br/>• Try video dengan durasi ≥ 2 detik<br/>• Test di browser PC dulu |
| **Auto-refresh tidak jalan** | • Check `/api/settings` returns `autoRefreshInterval` (default 60000ms)<br/>• Check Supabase Realtime terhubung |

### Database & RLS

| Masalah | Solusi |
|--------|--------|
| **Policies tidak bekerja** | • Re-run migration `004_enable_row_level_security.sql`<br/>• Cek RLS enabled di dashboard<br/>• Use test-rls.html untuk debug |
| **Service role upload error** | • Cek `SUPABASE_SERVICE_ROLE_KEY` correct<br/>• Service role key hanya di `.env.local` (server-side) |

## 🔄 Recent Updates (v1.2.0)

### 🐛 Bug Fixes
- ✅ **FFmpeg single-image videos**: Fixed filter graph untuk single input (ganti concat dengan null passthrough)
- ✅ **Zero-duration images**: Clamp durasi ke 1 detik minimum, prevent -t 0 failure
- ✅ **Canvas2D performance warning**: Added willReadFrequently hint pada PDF rendering

### ⚡ Performance & Features
- ✅ **Configurable encoding**: Read video_* settings dari database (CRF, preset, profile, level, fps, gop, resolution)
- ✅ **Admin page optimization**: Preconnect/dns-prefetch ke Supabase untuk API calls lebih cepat
- ✅ **Exposed encoding defaults**: `/api/settings` menampilkan video_* dengan safe defaults

### 📝 Documentation
- ✅ **Updated README**: Dokumentasi encoding options dan troubleshooting lebih lengkap
- ✅ **RLS testing guide**: `test-rls.html` untuk validasi policies
- ✅ **Inline logging**: Enhanced console logs di generate-video untuk debugging

## 🔄 Changelog

### v1.2.0 (November 6, 2025)
- Fixed FFmpeg filter graph untuk single-image videos
- Durasi clamped ke ≥1s untuk prevent FFmpeg error
- Configurable video encoding via slideshow_settings
- Canvas willReadFrequently untuk PDF rendering
- Admin preconnect ke Supabase
- Enhanced troubleshooting docs

### v1.1.0 (November 5, 2025)
- RLS enabled dengan policies yang benar
- Performance: prefetch next slide, dynamic imports, resource hints
- FFmpeg encoding optimized untuk webOS

### v1.0.0
- Initial release

## 🤝 Kontribusi

Saran fitur / bug report / pull request sangat diterima!

- **Issues**: Silakan buka tab Issues di GitHub
- **Pull Requests**: Fork repo, commit, push, dan ajukan PR

---

Made with ❤️ for always‑on TV dashboards.

**Questions?** Cek bagian Troubleshooting atau buka Issue di repository.

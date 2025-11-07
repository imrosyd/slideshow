# 🎞️ Slideshow Dashboard System

**Solusi digital signage all-in-one untuk Smart TV dan display monitor.**  
Dashboard slideshow profesional untuk TV/Display dengan admin panel intuitif, penyimpanan di Supabase, konversi manual gambar/PDF menjadi video, dan optimisasi webOS agar layar tetap menyala selama pemutaran.

> **Last Updated**: November 7, 2025 | **Version**: v1.3.0 | **Status**: ✅ Production Ready

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/) 
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)

## 🎯 Apa itu Slideshow?

Slideshow adalah aplikasi **Next.js 14 + TypeScript** yang dirancang khusus untuk menampilkan rotasi konten visual di layar TV secara terus‑menerus tanpa gangguan. Admin dapat mengunggah gambar/PDF, mengatur durasi tampil per slide, urutan, dan caption melalui panel yang user-friendly. Sistem memungkinkan konversi manual konten menjadi video MP4 yang dioptimalkan untuk playback lancar di perangkat webOS (khususnya LG TV), dilengkapi mekanisme keep-awake agresif dan loop native agar layar tidak sleep.

## ✨ Fitur

### 🗂️ Manajemen Konten (Admin)
- ✅ Upload banyak file sekaligus (gambar/PDF) ke Supabase Storage
- ✅ Rename file, ubah durasi tampil, caption, urutan, dan visibilitas (hidden)
- ✅ Generate video MP4 secara manual per-image (libx264, yuv420p, optimized for webOS)
- ✅ Individual video generation - setiap gambar memiliki video sendiri
- ✅ Hapus file beserta metadata dan video terkait
- ✅ Drag & drop reordering, real-time preview
- ✅ PDF to images conversion dengan preview

### 📺 Pemutar Slideshow (Display/TV)
- ✅ Pemutaran video secara loop tanpa jeda dengan retry logic
- ✅ Auto-transition antar slide dengan preload untuk smooth playback
- ✅ Keep‑awake agresif untuk webOS TV (Wake Lock API, webOS Power Manager API)
- ✅ Optimisasi webOS: native video loop, webkit prefixes, retry playback
- ✅ Auto refresh konten berkala (60 detik)
- ✅ Smooth transitions dengan prefetch next slide (3 detik timeout)
- ✅ Fullscreen support dengan user gesture detection
- ✅ Real-time sync via Supabase channels untuk remote control

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
│       ├── UploadBox.tsx            # Upload gambar/PDF
│       ├── ImageCard.tsx            # Card display untuk setiap image
│       ├── GenerateVideoDialog.tsx  # Dialog generate video individual
│       ├── ConfirmModal.tsx         # Modal konfirmasi delete
│       └── ToastProvider.tsx        # Toast notifications
├── hooks/
│   ├── useImages.ts                 # Image management logic
│   └── useToast.ts                  # Toast notification hook
├── lib/
│   ├── auth.ts                      # Authentication utilities
│   ├── supabase.ts                  # Supabase client setup
│   ├── constants.ts                 # App constants
│   └── database.types.ts            # TypeScript types dari Supabase
├── pages/
│   ├── index.tsx                    # Pemutar slideshow (TV) - webOS optimized
│   ├── admin.tsx                    # Panel admin
│   ├── login.tsx                    # Login page
│   ├── remote.tsx                   # Remote control page
│   └── api/
│       ├── admin/
│       │   ├── generate-video.ts    # FFmpeg video generation (individual)
│       │   ├── delete-video.ts      # Delete video & update metadata
│       │   ├── metadata.ts          # Update image metadata
│       │   ├── images.ts            # List images
│       │   ├── settings.ts          # Video encoding settings
│       │   ├── force-refresh.ts     # Force slideshow refresh
│       │   └── cleanup-videos.ts    # Cleanup orphaned videos
│       ├── settings.ts              # Public settings endpoint
│       ├── images.ts                # Public image list
│       └── auth.ts                  # Authentication endpoint
├── supabase/                        # SQL migrations
│   ├── 001_create_image_durations_table.sql
│   ├── 002_create_slideshow_settings_table.sql
│   ├── 003_add_video_metadata_columns.sql
│   └── 004_enable_row_level_security.sql
├── public/
│   └── favicon.svg
├── styles/
│   └── globals.css
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
| **PDF conversion error** | Pastikan pdf.js library loaded, check console |

### Video Generation

| Masalah | Solusi |
|--------|--------|
| **Error 500 saat generate video** | • Durasi harus ≥ 1 detik per slide (auto-clamp)<br/>• Cek FFmpeg binary tersedia (dev: ada, Vercel: pastikan environment ok) |
| **Video tidak muncul di admin** | • Refresh page atau klik "Force Refresh"<br/>• Cek browser console untuk error<br/>• Cek Storage bucket `slideshow-videos` ada |
| **MOTORCYCLE.mp4 sama dengan CAR.mp4** | • Generate ulang video MOTORCYCLE.png secara individual<br/>• Delete video lama dulu, lalu generate baru<br/>• Pastikan setiap image punya video sendiri |
| **File size besar/kecil tidak expected** | • Tune via `video_crf` (default 22)<br/>• CRF 18 = lebih bagus, lebih besar<br/>• CRF 28 = lebih kecil, kurang bagus |

### TV Playback (webOS)

| Masalah | Solusi |
|--------|--------|
| **Layar TV sleep/blank** | • Video harus H.264/yuv420p (default ok)<br/>• Koneksi stabil, pastikan buffer<br/>• Check keep-awake mekanisme di console logs |
| **Video tidak play di webOS TV** | • Verify video format: `ffmpeg -i [file]`<br/>• Try video dengan durasi ≥ 2 detik<br/>• Check console untuk webOS detection log |
| **Fullscreen error warning** | • Normal - fullscreen hanya bisa triggered oleh user gesture<br/>• Klik/tap layar untuk trigger fullscreen |
| **Supabase Realtime warning** | • Fixed di v1.3 - menggunakan httpSend() untuk REST delivery<br/>• No impact ke functionality |

### Database & RLS

| Masalah | Solusi |
|--------|--------|
| **Policies tidak bekerja** | • Re-run migration `004_enable_row_level_security.sql`<br/>• Cek RLS enabled di dashboard<br/>• Use test-rls.html untuk debug |
| **Service role upload error** | • Cek `SUPABASE_SERVICE_ROLE_KEY` correct<br/>• Service role key hanya di `.env.local` (server-side) |

## 🔄 Recent Updates (v1.3.0)

### 🎯 Major Changes
- ✅ **Manual video generation only**: Removed auto-generate, videos hanya di-generate via button
- ✅ **Individual video per image**: Setiap gambar memiliki video MP4 sendiri (CAR.png → CAR.mp4, MOTORCYCLE.png → MOTORCYCLE.mp4)
- ✅ **No batch generation**: Tidak ada lagi batch video generation yang menggabungkan multiple images

### 🐛 Bug Fixes  
- ✅ **Double transition fixed**: Prevented multiple preload events causing duplicate transitions
- ✅ **Preload timeout**: Added 3-second fallback untuk force transition jika video load lambat
- ✅ **Supabase Realtime warnings**: Fixed dengan menggunakan `httpSend()` untuk explicit REST delivery
- ✅ **Fullscreen API warnings**: Added user gesture detection untuk prevent browser warnings
- ✅ **Video naming in logs**: Console logs sekarang menampilkan nama video yang sebenarnya (`.mp4`) bukan nama PNG

### ⚡ Performance & UX
- ✅ **webOS optimization**: Full webOS TV compatibility dengan multiple keep-awake methods
- ✅ **Smooth video transitions**: Improved preload logic dengan prevent double-trigger
- ✅ **Control overlay fix**: Overlay hanya muncul saat ada user interaction
- ✅ **Video looping**: Ensured continuous loop untuk single & multiple videos
- ✅ **File cleanup**: Removed unused components (BatchVideoDialog, GenerateAllVideoDialog)

### 📝 Documentation
- ✅ **Updated README**: Struktur project terbaru dan workflow manual generation
- ✅ **webOS compatibility**: Complete checklist untuk webOS TV deployment
- ✅ **Troubleshooting guide**: Enhanced dengan solusi untuk masalah umum

## 🔄 Changelog

### v1.3.0 (November 7, 2025)
- Manual individual video generation (no auto-generate)
- Fixed double transition bug dengan transitionTriggered flag
- Added preload timeout fallback (3 seconds)
- Fixed Supabase Realtime deprecation warnings
- Fixed fullscreen API user gesture requirement
- Video naming consistency di logs dan UI
- webOS full compatibility verified
- File cleanup: removed unused components
- Updated documentation dan struktur project

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

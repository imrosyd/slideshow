# 📺 Slideshow Display System# 🎞️ Slideshow Dashboard System



[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)**Solusi digital signage all-in-one untuk Smart TV dan display monitor.**  

[![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black)](https://nextjs.org/)Dashboard slideshow profesional untuk TV/Display dengan admin panel intuitif, penyimpanan di Supabase, konversi manual gambar/PDF menjadi video, dan optimisasi webOS agar layar tetap menyala selama pemutaran.

[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)> **Last Updated**: November 7, 2025 | **Version**: v1.5.0 | **Status**: ✅ Production Ready

> **Latest Feature**: � **On-Screen UI Controls** - Mouse-activated control panel with distance-based trigger

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/) 

---[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)

## English[![UI Controls](https://img.shields.io/badge/UI%20Controls-Mouse%20Activated-orange)](README.md)



### 🌟 Overview## 🎯 Apa itu Slideshow?



A professional digital signage and slideshow management system built with Next.js, designed for webOS TVs and modern displays. Features automatic video conversion, real-time remote control, and a beautiful glassmorphism UI.Slideshow adalah aplikasi **Next.js 14 + TypeScript** yang dirancang khusus untuk menampilkan rotasi konten visual di layar TV secara terus‑menerus tanpa gangguan. Admin dapat mengunggah gambar/PDF, mengatur durasi tampil per slide, urutan, dan caption melalui panel yang user-friendly. Sistem memungkinkan konversi manual konten menjadi video MP4 yang dioptimalkan untuk playback lancar di perangkat webOS (khususnya LG TV), dilengkapi mekanisme keep-awake agresif dan loop native agar layar tidak sleep.



### ✨ Key Features## ✨ Fitur



- **🎬 Automatic Video Conversion**: Convert images to videos with configurable durations### 🗂️ Manajemen Konten (Admin)

- **📱 Remote Control**: Control slideshow from any device via real-time sync- ✅ Upload banyak file sekaligus (gambar/PDF) ke Supabase Storage

- **🎨 Glassmorphism UI**: Modern, professional interface matching across all pages- ✅ Rename file, ubah durasi tampil, caption, urutan, dan visibilitas (hidden)

- **🖼️ Image Gallery**: Interactive bottom gallery with auto-hide feature- ✅ Generate video MP4 secara manual per-image (libx264, yuv420p, optimized for webOS)

- **⚡ Smart Preloading**: Optimized video preloading for smooth transitions- ✅ Individual video generation - setiap gambar memiliki video sendiri

- **🔄 Auto-refresh**: Automatic content updates every 60 seconds- ✅ Hapus file beserta metadata dan video terkait

- **💤 Keep Awake**: Prevents display from sleeping during playback- ✅ Drag & drop reordering, real-time preview

- **🧹 Auto Cleanup**: Automatic removal of corrupt or orphaned files- ✅ PDF to images conversion dengan preview

- **📊 Admin Dashboard**: Full-featured management panel with drag-and-drop upload

### 📺 Pemutar Slideshow (Display/TV)

### 🚀 Quick Start- ✅ Pemutaran video secara loop tanpa jeda dengan retry logic

- ✅ Auto-transition antar slide dengan preload untuk smooth playback

#### Prerequisites- ✅ Keep‑awake agresif untuk webOS TV (Wake Lock API, webOS Power Manager API)

- ✅ Optimisasi webOS: native video loop, webkit prefixes, retry playback

- Node.js 18+ - ✅ Auto refresh konten berkala (60 detik)

- npm or yarn- ✅ Smooth transitions dengan prefetch next slide (3 detik timeout)

- Supabase account- ✅ Fullscreen support dengan user gesture detection

- ✅ Real-time sync via Supabase channels untuk remote control

#### Installation- ✅ **On-screen UI controls** dengan mouse/touch activation



```bash### 🎮 UI Control System (NEW!)

# Clone repository- ✅ **Distance-Based Trigger** - Controls appear only when mouse moves 50+ pixels

git clone https://github.com/imrosyd/slideshow.git- ✅ **Smart Detection** - 2-second delay + first movement skip to prevent accidental triggers

cd slideshow- ✅ **Auto-Hide** - Automatically hides after 3 seconds of inactivity

- ✅ **Center Positioned** - Floating controls in the middle of screen

# Install dependencies- ✅ **Three Control Buttons**:

npm install  - ⏮️ Previous - Jump to previous slide

  - ⏸️/▶️ Pause/Resume - Toggle playback

# Setup environment variables  - ⏭️ Next - Jump to next slide

cp .env.example .env.local- ✅ **Hover Effects** - Visual feedback with scale animation and background change

# Edit .env.local with your Supabase credentials- ✅ **Clean Design** - Solid white buttons with black text/border

- ✅ **Transparent Background** - Minimal interference with content

# Run development server- ✅ **Multiple Control Methods**: Keyboard shortcuts, Remote control page, On-screen buttons

npm run dev

### 🧰 Infrastruktur

# Build for production- ✅ Supabase Storage: `slideshow-images` dan `slideshow-videos`

npm run build- ✅ Database: tabel `image_durations` dan `slideshow_settings`

npm start- ✅ Row Level Security (RLS) untuk keamanan data produksi

```- ✅ API server-side memakai Service Role Key (tidak terekspos ke client)

- ✅ Configurable FFmpeg encoding via database settings

#### Environment Variables

### 🔐 Keamanan

```env- ✅ Cookie HttpOnly untuk sesi admin

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url- ✅ Header keamanan (HSTS, X-Frame-Options, CSP, dll.)

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key- ✅ Sanitasi nama file dan batas ukuran upload

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key- ✅ RLS policies untuk akses terkontrol (enabled via migration)

ADMIN_PASSWORD=your_admin_password- ✅ Service Role Key untuk backend operations (tidak terekspos ke client)

```

## 🧱 Tech Stack

### 📖 Usage

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS

#### Main Slideshow (`/`)- **Backend**: Next.js API Routes (Node.js/Vercel compatible)

- Auto-plays video slideshow in fullscreen- **Database & Storage**: Supabase (PostgreSQL + Object Storage)

- Bottom gallery appears on mouse hover- **Video Processing**: FFmpeg via `@ffmpeg-installer/ffmpeg`

- Click images in gallery for fullscreen preview- **PDF Rendering**: pdf.js (client-side)

- Supports keyboard controls (Arrow keys, Space)- **UI Components**: Headless, fully custom Tailwind CSS



#### Admin Panel (`/admin`)## 🛠️ Instalasi

- Login with admin password

- Upload images (drag & drop or click)### 1️⃣ Clone & Masuk Folder

- Set custom durations per image

- Generate videos with FFmpeg```bash

- Manage existing contentgit clone https://github.com/imrosyd/slideshow.git

- Cleanup corrupt filescd slideshow

```

#### Remote Control (`/remote`)

- Control playback from any device### 2️⃣ Install Dependencies

- Previous/Next navigation

- Pause/Resume functionality```bash

- Real-time status syncnpm install

```

### 🎨 UI Features

### 3️⃣ Konfigurasi Environment

- **Glassmorphism Design**: Consistent glass-effect styling across all pages

- **Responsive Layout**: Optimized for all screen sizesBuat file `.env.local` di root proyek:

- **Dark Theme**: Professional slate color scheme

- **Smooth Animations**: Cubic-bezier transitions throughout```bash

- **Auto-hide Gallery**: Bottom bar appears on mouse proximity# Admin panel

ADMIN_PASSWORD=your_secure_password

### 🛠️ Technology Stack

# Supabase (public - aman di client)

- **Framework**: Next.js 14.2.33NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co

- **UI**: React 18, Tailwind CSSNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

- **Backend**: Supabase (Storage, Database, Realtime)

- **Video Processing**: FFmpeg# Supabase (server only - JANGAN diekspos ke client)

- **State Management**: React HooksSUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

- **Deployment**: Vercel

# Storage & DB (optional, defaults bekerja untuk setup standar)

### 📋 API RoutesSUPABASE_STORAGE_BUCKET=slideshow-images

SUPABASE_DURATIONS_TABLE=image_durations

- `/api/images` - Get slideshow images and videos```

- `/api/upload` - Upload new images

- `/api/admin/generate-video` - Convert image to video## 🗄️ Setup Supabase

- `/api/admin/cleanup-corrupt-videos` - Remove invalid entries

- `/api/admin/metadata` - Update image metadata### 1. Buat Storage Buckets

- `/api/settings` - Get/update slideshow settings

Di Supabase Dashboard → Storage, buat dua buckets:

### 🎯 Version History- `slideshow-images` (untuk gambar/PDF)

- `slideshow-videos` (untuk video hasil generate)

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### 2. Jalankan Database Migrations

### 🤝 Contributing

Masuk ke Supabase Dashboard → SQL Editor, jalankan secara berurutan:

Contributions are welcome! Please feel free to submit a Pull Request.

1. `supabase/001_create_image_durations_table.sql`

### 📄 License2. `supabase/002_create_slideshow_settings_table.sql`

3. `supabase/003_add_video_metadata_columns.sql`

This project is licensed under the MIT License.4. `supabase/004_enable_row_level_security.sql` (ENABLE RLS + policies)



### 👨‍💻 Author### 3. Konfigurasi Storage Policies



**Imron**Di Dashboard → Storage → [bucket name] → Policies, buat:

- GitHub: [@imrosyd](https://github.com/imrosyd)

**slideshow-images**:

---- ✅ Public SELECT (anon can read)

- ✅ Service role ALL (for admin operations)

## Bahasa Indonesia

**slideshow-videos**:

### 🌟 Ringkasan- ✅ Public SELECT (anon can read)

- ✅ Service role ALL (for admin operations)

Sistem manajemen slideshow dan digital signage profesional yang dibangun dengan Next.js, dirancang untuk TV webOS dan display modern. Fitur konversi video otomatis, kontrol jarak jauh real-time, dan UI glassmorphism yang indah.

### ⚙️ Opsi Encoding Video (Opsional)

### ✨ Fitur Utama

Atur parameter encoding FFmpeg melalui tabel `slideshow_settings` tanpa rebuild. Server memvalidasi nilai dan jatuh ke default jika invalid.

- **🎬 Konversi Video Otomatis**: Konversi gambar ke video dengan durasi yang dapat dikonfigurasi

- **📱 Kontrol Jarak Jauh**: Kontrol slideshow dari perangkat apapun via sinkronisasi real-time| Key | Default | Range | Deskripsi |

- **🎨 UI Glassmorphism**: Antarmuka modern dan profesional yang konsisten di semua halaman|-----|---------|-------|-----------|

- **🖼️ Galeri Gambar**: Galeri bawah interaktif dengan fitur auto-hide| `video_crf` | `22` | 15–35 | Kualitas (lebih kecil = lebih bagus/lebih besar file) |

- **⚡ Smart Preloading**: Preloading video yang dioptimalkan untuk transisi mulus| `video_preset` | `veryfast` | ultrafast…veryslow | Kecepatan encoding |

- **🔄 Auto-refresh**: Pembaruan konten otomatis setiap 60 detik| `video_profile` | `high` | baseline, main, high | H.264 profile |

- **💤 Keep Awake**: Mencegah display tidur selama pemutaran| `video_level` | `4.0` | 3.1, 4.0, 4.2, … | H.264 level |

- **🧹 Auto Cleanup**: Penghapusan otomatis file rusak atau yatim| `video_fps` | `24` | 15–60 | Frame per second |

- **📊 Dashboard Admin**: Panel manajemen lengkap dengan upload drag-and-drop| `video_gop` | `48` | fps … fps×10 | Keyframe interval (default 2×fps) |

| `video_width` | `1920` | 320–3840 | Output width (scale+pad maintains aspect ratio) |

### 🚀 Memulai| `video_height` | `1080` | 240–2160 | Output height (scale+pad maintains aspect ratio) |



#### Prasyarat**Default values** aman untuk webOS TV playback.  

**Catatan**: Scale akan selalu menjaga rasio aspek (scale+pad) dan output selalu yuv420p untuk kompatibilitas luas.

- Node.js 18+

- npm atau yarn## 🔒 Testing RLS

- Akun Supabase

Gunakan alat uji yang sudah disertakan:

#### Instalasi

1. Buka file `test-rls.html` di browser

```bash2. Isi Supabase URL dan Anon Key

# Clone repository3. Klik "Initialize" lalu "Run All Tests"

git clone https://github.com/imrosyd/slideshow.git4. Semua tes harus **PASS** (anon hanya bisa membaca konten non‑hidden)

cd slideshow

## 💡 Cara Menjalankan

# Install dependencies

npm install### Development



# Setup environment variables```bash

cp .env.example .env.localnpm run dev

# Edit .env.local dengan kredensial Supabase Anda# Buka: http://localhost:3000 (atau 3001 jika 3000 sedang dipakai)

```

# Jalankan development server

npm run devHalaman penting:

- **`/admin`** — panel admin (login dengan `ADMIN_PASSWORD`)

# Build untuk production- **`/`** — pemutar slideshow untuk TV

npm run build- **`/remote`** — remote control page (optional)

npm start

```Untuk debugging, cek **browser console** dan **server logs** di terminal.



#### Variabel Environment### Production Build



```env```bash

NEXT_PUBLIC_SUPABASE_URL=url_supabase_andanpm run build

NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key_supabase_andanpm start

SUPABASE_SERVICE_ROLE_KEY=service_role_key_anda```

ADMIN_PASSWORD=password_admin_anda

```## 🚀 Deploy ke Vercel



### 📖 Penggunaan### 1. Push ke GitHub



#### Slideshow Utama (`/`)```bash

- Auto-play video slideshow fullscreengit add .

- Galeri bawah muncul saat hover mousegit commit -m "v1.2.0: FFmpeg fixes and configurable encoding"

- Klik gambar di galeri untuk preview fullscreengit push origin main

- Mendukung kontrol keyboard (Arrow keys, Space)```



#### Panel Admin (`/admin`)### 2. Hubungkan ke Vercel

- Login dengan password admin

- Upload gambar (drag & drop atau klik)1. Masuk ke [vercel.com](https://vercel.com) → Import Project

- Atur durasi custom per gambar2. Pilih repository `slideshow`

- Generate video dengan FFmpeg3. Set Environment Variables:

- Kelola konten yang ada   - `ADMIN_PASSWORD`

- Bersihkan file rusak   - `NEXT_PUBLIC_SUPABASE_URL`

   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Kontrol Jarak Jauh (`/remote`)   - `SUPABASE_SERVICE_ROLE_KEY`

- Kontrol pemutaran dari perangkat apapun4. Click **Deploy**

- Navigasi Previous/Next

- Fungsi Pause/Resume### 3. Verifikasi Database

- Sinkronisasi status real-time

Pastikan semua SQL migrations (bagian Setup Supabase) sudah dijalankan di Supabase project.

### 🎨 Fitur UI

## 📁 Struktur Direktori

- **Desain Glassmorphism**: Styling efek kaca yang konsisten di semua halaman

- **Layout Responsif**: Dioptimalkan untuk semua ukuran layar```

- **Tema Gelap**: Skema warna slate profesionalslideshow/

- **Animasi Mulus**: Transisi cubic-bezier di seluruh aplikasi├── components/

- **Galeri Auto-hide**: Bar bawah muncul saat mouse mendekat│   └── admin/

│       ├── UploadBox.tsx            # Upload gambar/PDF

### 🛠️ Stack Teknologi│       ├── ImageCard.tsx            # Card display untuk setiap image

│       ├── GenerateVideoDialog.tsx  # Dialog generate video individual

- **Framework**: Next.js 14.2.33│       ├── ConfirmModal.tsx         # Modal konfirmasi delete

- **UI**: React 18, Tailwind CSS│       └── ToastProvider.tsx        # Toast notifications

- **Backend**: Supabase (Storage, Database, Realtime)├── hooks/

- **Pemrosesan Video**: FFmpeg│   ├── useImages.ts                 # Image management logic

- **State Management**: React Hooks│   └── useToast.ts                  # Toast notification hook

- **Deployment**: Vercel├── lib/

│   ├── auth.ts                      # Authentication utilities

### 📋 API Routes│   ├── supabase.ts                  # Supabase client setup

│   ├── constants.ts                 # App constants

- `/api/images` - Dapatkan gambar dan video slideshow│   └── database.types.ts            # TypeScript types dari Supabase

- `/api/upload` - Upload gambar baru├── pages/

- `/api/admin/generate-video` - Konversi gambar ke video│   ├── index.tsx                    # Pemutar slideshow (TV) - webOS optimized

- `/api/admin/cleanup-corrupt-videos` - Hapus entri invalid│   ├── admin.tsx                    # Panel admin

- `/api/admin/metadata` - Update metadata gambar│   ├── login.tsx                    # Login page

- `/api/settings` - Get/update pengaturan slideshow│   ├── remote.tsx                   # Remote control page

│   └── api/

### 🎯 Riwayat Versi│       ├── admin/

│       │   ├── generate-video.ts    # FFmpeg video generation (individual)

Lihat [CHANGELOG.md](CHANGELOG.md) untuk riwayat versi lengkap.│       │   ├── delete-video.ts      # Delete video & update metadata

│       │   ├── metadata.ts          # Update image metadata

### 🤝 Kontribusi│       │   ├── images.ts            # List images

│       │   ├── settings.ts          # Video encoding settings

Kontribusi sangat diterima! Silakan submit Pull Request.│       │   ├── force-refresh.ts     # Force slideshow refresh

│       │   └── cleanup-videos.ts    # Cleanup orphaned videos

### 📄 Lisensi│       ├── settings.ts              # Public settings endpoint

│       ├── images.ts                # Public image list

Proyek ini dilisensikan di bawah MIT License.│       └── auth.ts                  # Authentication endpoint

├── supabase/                        # SQL migrations

### 👨‍💻 Pembuat│   ├── 001_create_image_durations_table.sql

│   ├── 002_create_slideshow_settings_table.sql

**Imron**│   ├── 003_add_video_metadata_columns.sql

- GitHub: [@imrosyd](https://github.com/imrosyd)│   └── 004_enable_row_level_security.sql

├── public/

---│   └── favicon.svg

├── styles/

**Current Version**: 2.0.0 | **Last Updated**: November 8, 2025│   └── globals.css

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

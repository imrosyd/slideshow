# 🎬 Slideshow Dashboard System# Slideshow Dashboard System
# 🎞️ Slideshow

Dashboard slideshow untuk TV/Display dengan admin panel sederhana, penyimpanan di Supabase, konversi gambar/PDF menjadi video, dan optimisasi webOS agar layar tetap menyala selama pemutaran.

## 🎯 Apa itu Slideshow?

Slideshow adalah aplikasi Next.js untuk menampilkan rotasi konten di layar TV secara terus‑menerus. Admin dapat mengunggah gambar/PDF, mengatur durasi dan urutan, serta mengonversi menjadi video MP4. Pemutar di sisi TV dioptimalkan agar stabil di perangkat webOS (LG TV), termasuk mekanisme keep‑awake dan loop native.

## ✨ Fitur

### 🗂️ Manajemen Konten (Admin)
- Upload banyak file sekaligus (gambar/PDF) ke Supabase Storage
- Rename file, ubah durasi tampil, caption, urutan, dan visibilitas (hidden)
- Generate video MP4 dari gambar/PDF (libx264, yuv420p) untuk pemutaran yang lebih mulus di TV
- Hapus file beserta metadata terkait

### 📺 Pemutar Slideshow (Display/TV)
- Pemutaran video secara loop tanpa jeda dengan retry/backoff
- Keep‑awake agresif (Wake Lock API, event video, dan webOS API)
- Optimisasi webOS: throttled triggers dan native loop
- Auto refresh konten berkala

### 🧰 Infrastruktur
- Supabase Storage: `slideshow-images` dan `slideshow-videos`
- Database: tabel `image_durations` dan `slideshow_settings`
- Row Level Security (RLS) untuk keamanan data produksi
- API server-side memakai Service Role Key (tidak terekspos ke client)

### 🔐 Keamanan
- Cookie HttpOnly untuk sesi admin
- Header keamanan (HSTS, X-Frame-Options, CSP, dll.)
- Sanitasi nama file dan batas ukuran upload
- Rekomendasi: aktifkan RLS (tersedia migration) dan rate limiting

## 🧱 Tech Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Supabase (Postgres, Storage, Realtime)
- FFmpeg (via `@ffmpeg-installer/ffmpeg`)

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

# Supabase (server only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # JANGAN diekspos ke client

# Storage & DB
SUPABASE_STORAGE_BUCKET=slideshow-images
SUPABASE_DURATIONS_TABLE=image_durations
```

## 🗄️ Setup Supabase

1. Buat Storage Buckets:
   - `slideshow-images` (untuk gambar)
   - `slideshow-videos` (untuk video hasil generate)

2. Jalankan migration SQL secara berurutan (Supabase Dashboard → SQL Editor):
   - `supabase/001_create_image_durations_table.sql`
   - `supabase/002_create_slideshow_settings_table.sql`
   - `supabase/003_add_video_metadata_columns.sql`
   - `supabase/004_enable_row_level_security.sql` (ENABLE RLS + policies)

3. Buat Storage Policies (manual di Dashboard → Storage → [bucket] → Policies):
   - Public read (SELECT) untuk kedua bucket
   - Service role full access (SELECT/INSERT/UPDATE/DELETE)

### ⚙️ Opsi Encoding Video (opsional)

Anda bisa mengatur parameter encoding FFmpeg melalui tabel `slideshow_settings` tanpa rebuild. Nilai default sudah aman untuk webOS.

- `video_crf` (default: `22`) — kualitas 18–28 (lebih kecil = lebih bagus/lebih besar file)
- `video_preset` (default: `veryfast`) — `ultrafast`…`veryslow`
- `video_profile` (default: `high`) — `baseline` | `main` | `high`
- `video_level` (default: `4.0`) — contoh: `3.1`, `4.0`
- `video_fps` (default: `24`) — 15–60
- `video_gop` (default: `2 × fps`, ex: `48` untuk 24fps)
- `video_width` (default: `1920`) — 320–3840
- `video_height` (default: `1080`) — 240–2160

Catatan: Server akan memvalidasi rentang nilai dan jatuh ke default bila invalid. Scale akan menjaga rasio aspek (scale+pad) dan memakai `yuv420p` untuk kompatibilitas luas.

## 🔒 Testing RLS

Gunakan alat uji yang sudah disertakan:

1. Buka file `test-rls.html` di browser
2. Isi Supabase URL dan Anon Key
3. Klik “Initialize” lalu “Run All Tests”
4. Semua tes harus PASS (anon hanya bisa membaca konten non‑hidden)

## 💡 Cara Menjalankan

### Development

```bash
npm run dev
# Buka: http://localhost:3000 (atau 3001 jika 3000 sedang dipakai)
```

Halaman penting:
- `/admin` — panel admin (login pakai `ADMIN_PASSWORD`)
- `/` — pemutar slideshow untuk TV

### Production Build

```bash
npm run build
npm start
```

## 🚀 Deploy

Platform yang disarankan: Vercel.

1. Push repo ke GitHub
2. Hubungkan ke Vercel, set Environment Variables sesuai `.env.local`
3. Deploy. Pastikan migrasi SQL (bagian Supabase) sudah dijalankan.

## 📁 Struktur Direktori

```
slideshow/
├── components/
├── hooks/
├── lib/
├── pages/
│   ├── index.tsx             # Pemutar slideshow (TV)
│   ├── admin.tsx             # Panel admin
│   └── api/                  # API routes (server side)
├── supabase/                 # SQL migrations
│   ├── 001_create_image_durations_table.sql
│   ├── 002_create_slideshow_settings_table.sql
│   ├── 003_add_video_metadata_columns.sql
│   └── 004_enable_row_level_security.sql
├── public/
├── styles/
└── test-rls.html             # Alat uji RLS
```

## 🧪 Scripts yang Tersedia

| Script      | Fungsi                              |
|-------------|-------------------------------------|
| `dev`       | Menjalankan Next.js (development)    |
| `build`     | Build production                     |
| `start`     | Menjalankan server production        |
| `lint`      | Menjalankan ESLint                   |

## 🧰 Troubleshooting

- 401 saat akses `/admin`: cek `ADMIN_PASSWORD` di environment
- 403 saat upload ke Storage: cek Storage Policies dan Service Role Key
- Anon bisa menulis data: pastikan migration RLS `004` sudah dijalankan dan policies benar
- Layar TV sleep/blank: pastikan video hasil generate (MP4/h264/yuv420p) dan koneksi stabil

## 🤝 Kontribusi

Saran fitur/bug report/pull request sangat diterima. Silakan gunakan tab Issues atau ajukan PR langsung.

---

Made with ❤️ for always‑on TV dashboards.



> **Digital Signage Solution untuk Smart TV & Display Monitor**Aplikasi slideshow modern berbasis Next.js dengan panel admin profesional untuk mengelola dan menampilkan dashboard secara otomatis. Dirancang khusus untuk Smart TV dan display monitor dengan fitur keep-awake untuk LG TV.



Aplikasi slideshow modern berbasis Next.js dengan panel admin profesional untuk mengelola dan menampilkan konten visual secara otomatis. Dirancang khusus untuk Smart TV (khususnya LG webOS), display monitor, dan digital signage dengan fitur auto-convert image-to-video untuk performa optimal.> **Last Updated**: November 5, 2025  

> **Status**: ✅ Production Ready

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)## 🆕 Recent Changes (v1.1.0)

[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)

### ✨ Improvements

---- Removed hide/show feature for cleaner UI

- Simplified admin panel with focused features

## 📑 Daftar Isi- Improved image management workflow

- Optimized database schema for better performance

- [Gambaran Umum](#-gambaran-umum)- Cleaned up codebase - removed 9 documentation files

- [Fitur Utama](#-fitur-utama)

- [Teknologi](#-teknologi-yang-digunakan)### 🔧 What's Working

- [Prasyarat](#-prasyarat)- ✅ Slideshow with smooth transitions

- [Instalasi](#-instalasi)- ✅ Image upload & management

- [Konfigurasi](#-konfigurasi)- ✅ Custom duration per image

- [Cara Penggunaan](#-cara-penggunaan)- ✅ Drag & drop reordering

- [Deployment](#-deployment)- ✅ Real-time sync with Supabase

- [Security](#-security)- ✅ Remote control page

- [Troubleshooting](#-troubleshooting)- ✅ LG TV keep-awake features

- [FAQ](#-faq)- ✅ Admin authentication



---## ✨ Fitur Utama



## 🎯 Gambaran Umum### 🎬 Slideshow Display

- **Auto-rotation slideshow** dengan durasi custom per gambar (1-60 detik)

### Apa itu Slideshow Dashboard System?- **4 Transition effects**: Fade, Slide, Zoom, None

- **Auto-refresh** setiap 60 detik untuk sinkronisasi otomatis

Aplikasi ini adalah **solusi digital signage all-in-one** yang memungkinkan Anda:- **Real-time sync** dengan Supabase Storage via WebSocket

- **Multi-language** dengan auto-rotate (English, Korean, Indonesian)

1. **Upload & Manage** - Kelola konten visual (gambar) melalui admin panel- **LG TV optimization**:

2. **Auto-Convert** - Otomatis convert gambar menjadi video untuk performa TV lebih baik  - Wake Lock API untuk mencegah sleep mode

3. **Display** - Tampilkan slideshow di Smart TV/monitor dengan auto-rotate  - webOS browser keep-awake triggers (Luna Service API)

4. **Remote Control** - Kontrol dari device lain (smartphone/tablet) secara real-time  - Hidden video playback untuk trick OS

5. **Keep-Awake** - TV tidak akan sleep/screensaver dengan teknologi khusus webOS  - Activity simulation setiap 15 menit

  - Continuous keep-alive setiap 5 menit

### Use Cases  - Auto-reload setiap 20 menit

  - Fullscreen mode retry setiap 10 menit

- 📺 **Digital Signage** - Menu board restaurant, info display, advertising  - Fullscreen mode auto-request

- 🏢 **Corporate Display** - Company dashboard, KPI monitoring, announcement

- 🎓 **Education** - Classroom presentations, campus information board### 🎮 Kontrol Slideshow

- 🏪 **Retail** - Product showcase, promotional content- **Keyboard shortcuts**:

- 🎪 **Event Display** - Conference schedules, event information  - `Space` - Play/Pause

  - `←/→` atau `↑/↓` - Navigate slides

### Kenapa Menggunakan Video Instead of Images?  - `Home/End` - First/Last slide

  - `C` atau `ESC` - Toggle controls overlay

**Problem**: TV (khususnya LG webOS) sering sleep/screensaver saat hanya menampilkan gambar static.- **On-screen controls** dengan auto-hide (3-5 detik inactivity)

- **Transition selector** langsung dari slideshow

**Solution**: Aplikasi ini auto-convert gambar menjadi video dengan durasi yang Anda tentukan. Video playback membuat TV tetap aktif tanpa sleep.- **Thumbnail grid** untuk quick navigation

- **Mouse movement detection** untuk menampilkan controls

**Benefits**:

- ✅ TV tidak pernah sleep atau masuk screensaver mode### 📱 Remote Control (Mobile-Friendly)

- ✅ Slideshow berjalan 24/7 tanpa interupsi- **Responsive remote control page** untuk mengontrol slideshow dari device lain

- ✅ Tidak perlu manual intervention- **Real-time sync** via Supabase Realtime broadcast

- ✅ Quality gambar tetap terjaga (H.264, 1500k bitrate)- **Playback controls**: Play/Pause, Previous, Next, First, Last

- **Quick jump** ke slide tertentu

---- **Connection status indicator** dengan live update

- **Touch-optimized UI** dengan large buttons

## ✨ Fitur Utama

### 🛠️ Admin Panel

### 1. 🎬 Slideshow Display- **Modern glassmorphism UI** dengan gradient slate background

- **Image management**:

**Tampilan utama yang berjalan di Smart TV/Monitor**  - Drag & drop upload dengan progress indicator

  - Drag & drop reordering untuk urutan slideshow

- **Auto-rotation slideshow** dengan durasi custom per gambar  - Visual numbered badges (1, 2, 3, ...)

- **Smooth transitions** - 4 pilihan efek (Fade, Slide, Zoom, None)  - Custom duration per image (1-60 detik)

- **Real-time sync** - Perubahan di admin langsung tampil tanpa reload  - **Auto-convert images to video** untuk better TV keep-awake

- **Fullscreen mode** - Otomatis fullscreen untuk pengalaman maksimal- **Bulk operations**:

- **Responsive** - Adaptif dengan resolusi layar (HD, Full HD, 4K)  - Multi-select dengan checkbox

  - Bulk set duration

**LG webOS Optimization:**  - Bulk delete with confirmation

- Wake Lock API untuk prevent sleep mode- **Search & Filter**:

- Hidden video playback untuk trick webOS  - Search by filename

- Activity simulation setiap 15 menit  - Sort: Order, Name, Size, Date

- Fullscreen retry mechanism setiap 10 menit  - Dark mode dropdown dengan proper contrast

- **Statistics panel**:

### 2. 🛠️ Admin Panel  - Total images count

  - Total storage used

**Dashboard untuk mengelola konten** (`/admin`)  - Real-time updates

- **Force refresh** untuk trigger update di semua slideshow

**Image Management:**- **Toast notifications** untuk semua operasi

- ✅ **Drag & drop upload** - Upload multiple files sekaligus- **Fullscreen preview** untuk lihat image detail

- ✅ **Visual reordering** - Drag & drop untuk ubah urutan tampilan

- ✅ **Custom duration** - Set berapa lama setiap gambar ditampilkan (1-60 detik)### 🎨 Design System

- ✅ **Preview fullscreen** - Lihat gambar dalam ukuran penuh- **Consistent color palette**:

- ✅ **Rename files** - Ubah nama file langsung  - Background: Slate-950 gradient

- ✅ **Delete confirmation** - Konfirmasi sebelum hapus  - Accent: Sky-500 (blue) untuk primary actions

  - Secondary: Violet-500 untuk bulk actions

**Video Features:**  - Success: Green-500

- ✅ **Auto-generate video** - Convert gambar ke video otomatis  - Warning: Amber-500

- ✅ **Video preview** - Lihat video yang sudah di-generate  - Error: Red-500

- ✅ **Delete video** - Hapus video dan generate ulang jika perlu- **Glassmorphism effects** dengan backdrop blur

- ✅ **Status indicator** - Tanda hijau jika video sudah ada- **Smooth animations** pada semua interactions

- **Custom scrollbar** tipis dan elegan

**Bulk Operations:**- **Responsive layout** optimal untuk semua screen sizes

- Multi-select dengan checkbox- **Loading states** dengan skeleton screens

- Set duration untuk banyak gambar sekaligus

- Bulk delete dengan konfirmasi## 🏗️ Tech Stack

- Generate video untuk multiple images

- **Framework**: Next.js 14.2.33 (React 18, TypeScript)

**Search & Filter:**- **Styling**: Tailwind CSS 3.4.17

- Search by filename- **Backend**: Supabase (Storage, Realtime, Database)

- Sort by: Order, Name, Size, Upload Date- **Deployment**: Vercel

- Real-time filtering- **UI Components**: Custom components dengan Tailwind

- **State Management**: React Hooks (useState, useEffect, useCallback)

**Statistics:**- **Real-time**: Supabase Realtime broadcast channels

- Total images count

- Total storage used## 📁 Project Structure

- Total videos generated

- Live updates```

slideshow/

### 3. 📱 Remote Control├── pages/

│   ├── index.tsx           # Main slideshow display

**Kontrol slideshow dari device lain** (`/remote`)│   ├── admin.tsx           # Admin panel

│   ├── login.tsx           # Admin login page

- **Mobile-friendly UI** - Optimized untuk smartphone│   ├── remote.tsx          # Mobile remote control

- **Real-time control** - Play/Pause, Previous, Next│   ├── _app.tsx            # App wrapper

- **Jump to slide** - Langsung ke slide tertentu│   └── api/

- **Transition selector** - Ganti efek transisi on-the-fly│       ├── auth.ts         # Authentication endpoint

- **Connection status** - Indikator koneksi real-time│       ├── logout.ts       # Logout endpoint

- **Touch-optimized** - Button besar untuk mudah diklik│       ├── images.ts       # Get images list

│       ├── upload.ts       # Upload images

**Cara Kerja:**│       ├── config.ts       # Legacy config endpoint

1. Buka `/remote` di smartphone/tablet│       ├── settings.ts     # Slideshow settings (transition, etc)

2. Slideshow di TV akan otomatis respond│       ├── image/[name].ts # Serve individual image

3. Semua device terhubung via Supabase Realtime│       └── admin/

4. Tidak perlu pairing atau setup tambahan│           ├── images.ts   # Admin image operations (delete, etc)

│           ├── metadata.ts # Save image metadata (order, duration, visibility)

### 4. ⌨️ Keyboard Shortcuts│           └── force-refresh.ts # Trigger slideshow refresh

├── components/

Control slideshow langsung dari keyboard:│   └── admin/

│       ├── ConfirmModal.tsx   # Delete confirmation modal

| Shortcut | Aksi |│       ├── ImageCard.tsx      # Image card component

|----------|------|│       ├── ToastProvider.tsx  # Toast notification provider

| `Space` | Play / Pause |│       └── UploadBox.tsx      # Drag & drop upload component

| `←` `→` | Previous / Next slide |├── hooks/

| `↑` `↓` | Previous / Next slide |│   ├── useImages.ts        # Image management hook

| `Home` | Jump to first slide |│   └── useToast.ts         # Toast notification hook

| `End` | Jump to last slide |├── lib/

| `C` atau `ESC` | Toggle controls overlay |│   ├── supabase.ts         # Supabase client

| `F` | Toggle fullscreen |│   ├── auth.ts             # Auth utilities

│   ├── constants.ts        # App constants

---│   └── database.types.ts   # Supabase types

├── styles/

## 🛠️ Teknologi yang Digunakan│   └── globals.css         # Global styles & Tailwind imports

└── public/                 # Static assets

### Frontend```

- **Next.js 14.2** - React framework dengan SSR & API routes

- **TypeScript** - Type-safe development## 🚀 Getting Started

- **Tailwind CSS** - Utility-first CSS framework

- **React Hooks** - Modern React patterns### Prerequisites

- Node.js 18+ dan npm

### Backend & Storage- Akun Supabase (gratis di [supabase.com](https://supabase.com))

- **Supabase** - Backend-as-a-Service- Browser modern (Chrome, Firefox, Safari, Edge)

  - **Storage** - File hosting untuk images & videos

  - **Database** - PostgreSQL untuk metadata### Local Development

  - **Realtime** - WebSocket untuk sync real-time

- **Vercel** - Deployment platform dengan serverless functions1. **Clone repository**:

   ```bash

### Media Processing   git clone <repository-url>

- **FFmpeg** - Video generation dari images   cd slideshow

- **@ffmpeg-installer/ffmpeg** - FFmpeg binary untuk Vercel serverless   ```



### Authentication2. **Install dependencies**:

- **SHA-256 Hashing** - Password security   ```bash

- **Cookie-based Sessions** - Secure admin authentication   npm install

   ```

---

3. **Setup environment variables**:

## 📋 Prasyarat   ```bash

   cp .env.example .env.local

Sebelum instalasi, pastikan Anda memiliki:   ```

   

### 1. Software Requirements   Edit `.env.local` dan isi dengan kredensial Supabase Anda:

- **Node.js** v18.0 atau lebih baru ([Download](https://nodejs.org/))   ```env

- **npm** v9.0 atau lebih baru (included dengan Node.js)   # Admin Panel Password

- **Git** untuk clone repository ([Download](https://git-scm.com/))   ADMIN_PASSWORD=your_secure_password



### 2. Akun & Services   # Supabase Configuration

- **Supabase Account** (gratis) - [Daftar di supabase.com](https://supabase.com/)   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

- **Vercel Account** (optional, untuk deployment) - [Daftar di vercel.com](https://vercel.com/)   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

### 3. Browser Support   SUPABASE_STORAGE_BUCKET=slideshow-images

- **Development**: Chrome, Firefox, Safari, Edge (versi terbaru)   SUPABASE_DURATIONS_TABLE=image_durations

- **Production**: Mendukung semua modern browsers   ```

- **TV**: LG webOS, Samsung Tizen, Android TV

4. **Setup Supabase**:

---   

   **A. Buat Storage Bucket**

## 🚀 Instalasi   - Buka Supabase Dashboard → Storage

   - Klik "New bucket"

### Step 1: Clone Repository   - Nama: `slideshow-images`

   - Public bucket: ✅ Yes

```bash   

git clone https://github.com/yourusername/slideshow.git   **B. Buat Database Tables**

cd slideshow   - Buka Supabase Dashboard → SQL Editor

```   - Klik "New query"

   - Copy-paste SQL berikut dan Run:

### Step 2: Install Dependencies   

   ```sql

```bash   -- Table untuk menyimpan metadata gambar

npm install   CREATE TABLE image_durations (

```     id SERIAL PRIMARY KEY,

     filename VARCHAR(255) UNIQUE NOT NULL,

Ini akan install semua packages yang diperlukan (~5-10 menit tergantung koneksi).     duration_ms INTEGER,

     caption TEXT,

### Step 3: Setup Supabase     order_index INTEGER DEFAULT 0,

     hidden BOOLEAN DEFAULT false,

#### A. Buat Project Baru di Supabase     video_url TEXT,

     video_generated_at TIMESTAMP WITH TIME ZONE,

1. Login ke [Supabase Dashboard](https://app.supabase.com/)     video_duration_seconds NUMERIC,

2. Klik **"New Project"**     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

3. Isi:     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

   - **Name**: `slideshow` (atau nama sesuai keinginan)   );

   - **Database Password**: Simpan password ini, akan digunakan nanti   

   - **Region**: Pilih region terdekat (Southeast Asia)   CREATE INDEX idx_image_durations_filename ON image_durations(filename);

4. Klik **"Create new project"** dan tunggu ~2 menit   CREATE INDEX idx_image_durations_order ON image_durations(order_index);

   

#### B. Buat Storage Buckets   -- Table untuk settings slideshow

   CREATE TABLE slideshow_settings (

**Bucket untuk Images:**     id SERIAL PRIMARY KEY,

     key VARCHAR(255) UNIQUE NOT NULL,

1. Buka **Storage** di sidebar     value TEXT NOT NULL,

2. Klik **"New bucket"**     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

3. Isi:     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

   - **Name**: `slideshow-images`   );

   - **Public bucket**: ✅ **Yes**   

4. Klik **"Create bucket"**   INSERT INTO slideshow_settings (key, value) 

   VALUES ('transition_effect', 'fade');

**Bucket untuk Videos:**   

   -- Trigger untuk auto-update timestamp

1. Klik **"New bucket"** lagi   CREATE OR REPLACE FUNCTION update_updated_at_column()

2. Isi:   RETURNS TRIGGER AS $$

   - **Name**: `slideshow-videos`   BEGIN

   - **Public bucket**: ✅ **Yes**     NEW.updated_at = NOW();

3. Klik **"Create bucket"**     RETURN NEW;

   END;

#### C. Buat Database Tables   $$ LANGUAGE plpgsql;

   

1. Buka **SQL Editor** di sidebar   CREATE TRIGGER update_image_durations_updated_at

2. Klik **"New query"**     BEFORE UPDATE ON image_durations

3. Copy paste SQL dari file `doc/001_create_image_durations_table.sql`     FOR EACH ROW

4. Klik **"Run"** atau tekan `Ctrl+Enter`     EXECUTE FUNCTION update_updated_at_column();

5. Ulangi untuk `doc/002_create_slideshow_settings_table.sql`   

6. Dan `doc/003_add_video_metadata_columns.sql`   CREATE TRIGGER update_slideshow_settings_updated_at

     BEFORE UPDATE ON slideshow_settings

Atau run semua SQL sekaligus:     FOR EACH ROW

     EXECUTE FUNCTION update_updated_at_column();

```sql   ```

-- Table untuk metadata images   

CREATE TABLE image_durations (   **C. Enable Realtime** (Opsional)

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   - Buka Database → Replication

  filename TEXT NOT NULL UNIQUE,   - Klik "0 tables" → Enable untuk `image_durations`

  duration_ms INTEGER DEFAULT 5000,

  caption TEXT,5. **Run development server**:

  order_index INTEGER DEFAULT 0,   ```bash

  hidden BOOLEAN DEFAULT false,   npm run dev

  is_video BOOLEAN DEFAULT false,   ```

  video_url TEXT,

  video_duration_seconds INTEGER,6. **Access the app**:

  video_generated_at TIMESTAMPTZ,   - Slideshow: http://localhost:3000

  created_at TIMESTAMPTZ DEFAULT NOW(),   - Admin Panel: http://localhost:3000/admin

  updated_at TIMESTAMPTZ DEFAULT NOW()   - Remote Control: http://localhost:3000/remote

);   - Login: http://localhost:3000/login



CREATE INDEX idx_image_durations_order ON image_durations(order_index);### Build for Production

CREATE INDEX idx_image_durations_hidden ON image_durations(hidden);

CREATE INDEX idx_image_durations_filename ON image_durations(filename);```bash

npm run build

-- Table untuk settingsnpm start

CREATE TABLE slideshow_settings (```

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key TEXT NOT NULL UNIQUE,## 🌐 Deployment

  value TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),### Deploy to Vercel (Recommended)

  updated_at TIMESTAMPTZ DEFAULT NOW()

);1. **Push to GitHub**:

   ```bash

CREATE INDEX idx_slideshow_settings_key ON slideshow_settings(key);   git push origin main

   ```

-- Auto-update timestamp function

CREATE OR REPLACE FUNCTION update_updated_at_column()2. **Import to Vercel**:

RETURNS TRIGGER AS $$   - Buka [vercel.com](https://vercel.com)

BEGIN   - Click "Add New" → "Project"

  NEW.updated_at = NOW();   - Import your GitHub repository

  RETURN NEW;

END;3. **Configure Environment Variables**:

$$ LANGUAGE plpgsql;   

   Add the following variables in **Project Settings → Environment Variables**:

CREATE TRIGGER update_image_durations_updated_at   

  BEFORE UPDATE ON image_durations   | Variable | Value | Scope |

  FOR EACH ROW   |----------|-------|-------|

  EXECUTE FUNCTION update_updated_at_column();   | `ADMIN_PASSWORD` | Your admin password | Production, Preview, Development |

   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |

CREATE TRIGGER update_slideshow_settings_updated_at   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Production, Preview, Development |

  BEFORE UPDATE ON slideshow_settings   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Production, Preview, Development |

  FOR EACH ROW   | `SUPABASE_STORAGE_BUCKET` | `slideshow-images` | Production, Preview, Development |

  EXECUTE FUNCTION update_updated_at_column();   | `SUPABASE_DURATIONS_TABLE` | `image_durations` | Production, Preview, Development |

```

4. **Deploy**:

#### D. Ambil API Keys   - Click "Deploy"

   - Wait for build to complete

1. Buka **Settings** → **API** di sidebar   - Access your app at `https://your-project.vercel.app`

2. Copy credentials berikut:

   - **Project URL** (contoh: `https://xxxxx.supabase.co`)> **⚠️ Important**: All environment variables must be set for all scopes. Missing variables will cause deployment to fail.

   - **anon public** key (di bagian Project API keys)

   - **service_role** key (klik "Reveal" dulu)### Vercel Configuration



⚠️ **PENTING**: Simpan `service_role` key dengan aman, jangan share ke public!The project includes `vercel.json` with optimized settings:

- Build optimization enabled

### Step 4: Setup Environment Variables- 60-second function timeout for uploads

- Proper file size limits

1. Copy file template:- SSR configuration for dynamic routes



```bash## 📖 Usage Guide

cp .env.example .env.local

```### Admin Panel Workflow



2. Edit `.env.local`:1. **Login**:

   - Navigate to `/login`

```env   - Enter admin password

# Admin Panel Password - Ganti dengan password kuat Anda   - Click "Sign In"

ADMIN_PASSWORD=your_super_secure_password_here

2. **Upload Images**:

# Optional: Salt untuk hashing   - Drag & drop files to upload box

ADMIN_PASSWORD_SALT=slideshow-admin-salt-change-this   - Or click to browse files

   - Supported formats: PNG, JPG, JPEG, GIF, WEBP, BMP, SVG, AVIF

# Supabase Configuration   - Maximum file size: 10MB per file

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...your_anon_key_here3. **Manage Images**:

SUPABASE_SERVICE_ROLE_KEY=eyJxxx...your_service_role_key_here   - **Reorder**: Drag & drop images to change order

   - **Set Duration**: Click duration selector (1-60s)

# Storage Configuration   - **Hide/Show**: Click eye icon to toggle visibility

SUPABASE_STORAGE_BUCKET=slideshow-images   - **Delete**: Click trash icon, confirm deletion

SUPABASE_DURATIONS_TABLE=image_durations   - **Preview**: Click image for fullscreen view

```

4. **Bulk Operations**:

### Step 5: Run Development Server   - Click "Bulk" button to enable selection mode

   - Select multiple images

```bash   - Choose bulk action:

npm run dev     - Show selected images

```     - Hide selected images

     - Set duration for all

Buka browser dan akses:     - Delete selected

- **Slideshow**: http://localhost:3000

- **Admin Panel**: http://localhost:3000/admin5. **Search & Filter**:

- **Remote Control**: http://localhost:3000/remote   - Use search box to find by filename

   - Filter by: All / Visible Only / Hidden Only

🎉 **Selesai!** Aplikasi sudah running di local.   - Sort by: Order / Name / Size / Date



---6. **Force Refresh**:

   - Click "🔄 Force Refresh" to update all active slideshows

## 📖 Cara Penggunaan   - Useful after batch updates



### A. Upload Images### Slideshow Controls



1. Buka **Admin Panel**: http://localhost:3000/admin**Keyboard Shortcuts**:

2. Login dengan password yang sudah diset- `Space` - Toggle Play/Pause

3. **Drag & drop** gambar ke area upload- `←` / `→` - Previous/Next slide

4. Tunggu upload selesai (progress bar akan muncul)- `↑` / `↓` - Previous/Next slide (alternative)

5. Gambar otomatis muncul di list- `Home` - Jump to first slide

- `End` - Jump to last slide

**Supported formats**: JPG, PNG, GIF, WebP, BMP- `C` or `ESC` - Toggle controls overlay



### B. Generate Video**On-Screen Controls** (press C or move mouse):

- Previous/Play-Pause/Next buttons

**Auto-generate:**- Transition effect selector (Fade/Slide/Zoom/None)

- Video otomatis ter-generate saat pertama kali load admin panel- Thumbnail grid for quick navigation

- Tunggu beberapa detik, status akan berubah jadi "✅ Video Generated"- Auto-hides after 3-5 seconds of inactivity



**Manual generate:**### Remote Control

1. Klik button **"Generate Video"** (icon play)

2. Tunggu proses convert (~10-30 detik)1. **Access Remote**:

3. Status berubah jadi hijau dengan info video   - Open `/remote` on your mobile device

   - Or scan QR code from admin panel (if enabled)

### C. Set Duration

2. **Control Slideshow**:

1. Di admin panel, setiap image card punya input **"Display duration"**   - Use Playback controls (Play/Pause)

2. Masukkan angka (1-60 detik)   - Navigate with Previous/Next buttons

3. Klik **"Save"** button   - Jump to first/last slide

4. Duration tersimpan dan digunakan di slideshow   - Select specific slide from Quick Jump grid

   - Change transition effect

### D. Reorder Images

3. **Connection**:

1. **Drag** image card   - Green dot = Connected

2. **Drop** ke posisi yang diinginkan   - Red dot = Not connected

3. Urutan otomatis update   - Real-time sync via Supabase



### E. Tampilkan Slideshow di TV### LG TV Optimization



**Di Smart TV:**The slideshow includes special optimizations for LG TVs:

1. Buka browser di TV

2. Akses URL: `http://your-ip:3000`1. **Wake Lock API**: Prevents screen from sleeping

3. Slideshow otomatis fullscreen dan play2. **Activity Simulation**: Triggers every 30 minutes

3. **Auto-Reload**: Full page reload every 30 minutes

**Cara cek IP:**4. **Fullscreen Mode**: Auto-requests after 2 seconds

```bash

# Windows: ipconfig**Console Logs** (check browser console):

# Mac/Linux: ifconfig- `🔒 Screen Wake Lock activated` - Wake lock working

```- `⏰ 30-minute activity trigger` - Activity simulation

- `🔄 Auto-reloading page` - Auto-reload triggered

**Contoh**: `http://192.168.1.100:3000`

## 🎨 Customization

### F. Remote Control

### Transition Effects

1. Buka browser di smartphone

2. Akses: `http://your-ip:3000/remote`4 built-in transition effects available:

3. Gunakan button control- **Fade**: Smooth opacity transition (default)

4. TV akan respond real-time- **Slide**: Horizontal slide animation

- **Zoom**: Scale + fade effect

---- **None**: Instant switch, no animation



## 🚀 Deployment ke VercelChange via:

- Slideshow controls (press C)

### Step 1: Push ke GitHub- Admin panel (Slideshow Settings section - if enabled)

- Remote control page

```bash

git add .### Default Settings

git commit -m "Initial commit"

git push -u origin mainEdit constants in `pages/index.tsx`:

``````typescript

const DEFAULT_SLIDE_DURATION_SECONDS = 15;  // Default duration

### Step 2: Deploy di Vercelconst LANGUAGE_SWAP_INTERVAL_MS = 4_000;    // Language rotation

const FADE_DURATION_MS = 500;               // Transition speed

1. Login ke [Vercel](https://vercel.com/)const AUTO_REFRESH_INTERVAL_MS = 60_000;    // Auto-refresh interval

2. Import GitHub repository```

3. Add environment variables (sama seperti `.env.local`)

4. Deploy### Styling



**URL**: `https://your-app.vercel.app`Main style configuration in `styles/globals.css`:

- Dark theme with slate background

---- Custom scrollbar

- Tailwind configuration in `tailwind.config.js`

## 🔒 Security

## 🔧 Troubleshooting

### Security Checklist

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

- [ ] Ganti `ADMIN_PASSWORD` dengan password kuat

- [ ] Ganti `ADMIN_PASSWORD_SALT` dengan random string### Common Issues

- [ ] Enable Supabase RLS policies

- [ ] Never commit `.env.local`**Images not showing**:

- [ ] Set environment variables di Vercel- Check Supabase Storage bucket configuration

- [ ] Enable 2FA di Supabase- Verify RLS policies allow public read

- Check browser console for errors

### Environment Variables

**Upload fails**:

**❌ NEVER expose:**- Verify file size < 10MB

- `ADMIN_PASSWORD`- Check supported file formats

- `SUPABASE_SERVICE_ROLE_KEY`- Ensure Supabase service role key is correct



**✅ Safe for client:****Slideshow not auto-updating**:

- `NEXT_PUBLIC_SUPABASE_URL`- Check Supabase Realtime is enabled

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`- Verify `image_durations` table exists

- Check browser console for WebSocket errors

---

**LG TV goes to sleep**:

## 🔧 Troubleshooting- Open browser console to verify wake lock logs

- Check if fullscreen mode is active

### Video tidak generate- Wait for 30-minute auto-reload cycle



1. Check Vercel function logs## 📄 API Reference

2. Verify `@ffmpeg-installer/ffmpeg` installed

3. Check function timeout (max 10s free tier)### GET /api/images

Returns list of all images with metadata.

### Slideshow tidak update

**Response**:

1. Click "Force Refresh ⚡" di admin```json

2. Check Supabase Realtime enabled{

3. Clear browser cache  "images": ["image1.jpg", "image2.png"],

  "durations": { "image1.jpg": 15000, "image2.png": 20000 },

### TV goes to sleep  "captions": { "image1.jpg": null, "image2.png": null }

}

1. Verify video generated (ada ✅ icon)```

2. Disable TV energy saving mode

3. Use fullscreen mode### POST /api/upload

Upload new images.

### Cannot login

**Request**: multipart/form-data with file(s)

1. Verify `ADMIN_PASSWORD` in `.env.local`

2. Clear cookies**Response**:

3. Try incognito mode```json

{

---  "success": true,

  "uploaded": ["new-image.jpg"],

## ❓ FAQ  "skipped": []

}

**Q: Apakah gratis?**  ```

A: Ya, dengan Supabase Free (500MB) & Vercel Free tier.

### DELETE /api/admin/images

**Q: Berapa banyak gambar?**  Delete image(s).

A: ~100-200 images (tergantung size) di free tier.

**Request**:

**Q: Support offline?**  ```json

A: Tidak, butuh internet untuk Supabase storage.{

  "filenames": ["image.jpg"]

**Q: Bisa custom domain?**  }

A: Ya, Vercel support custom domain gratis.```



**Q: Support Android TV?**  ### POST /api/admin/metadata

A: Ya, tested di LG webOS, Samsung Tizen, Android TV.Save image metadata (order, duration, visibility).



---**Request**:

```json

## 📞 Support{

  "metadata": [

- **Email**: support@yourcompany.com    { "filename": "image.jpg", "order": 1, "duration_ms": 15000, "hidden": false }

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/slideshow/issues)  ]

}

---```



## 🙏 Acknowledgments### GET/POST /api/settings

Get or update slideshow settings.

Built with:

- [Next.js](https://nextjs.org/)**GET Response**:

- [Supabase](https://supabase.com/)```json

- [Vercel](https://vercel.com/){

- [Tailwind CSS](https://tailwindcss.com/)  "transitionEffect": "fade",

- [FFmpeg](https://ffmpeg.org/)  "autoRefreshInterval": 60000,

  "defaultDuration": 15000

---}

```

**Made with ❤️ for the digital signage community**

**POST Request**:

Last updated: November 6, 2025```json

{
  "transitionEffect": "slide"
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Vercel](https://vercel.com/)

---

Made with ❤️ for seamless dashboard presentations

5. Pengaturan build (biasanya sudah otomatis):
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Development Command**: `npm run dev`

6. Klik **Deploy** dan tunggu prosesnya selesai.
7. Setiap commit baru ke branch `main` akan otomatis trigger deployment baru.

### 🔗 URL Deployment
Setelah deploy berhasil, Anda akan mendapatkan 3 URL:
- **Production**: `https://your-app.vercel.app` (slideshow)
- **Admin Panel**: `https://your-app.vercel.app/admin`
- **Login**: `https://your-app.vercel.app/login`

## 🔧 Cara Kerja

### Arsitektur Aplikasi
```
├── pages/
│   ├── index.tsx          # Halaman slideshow utama
│   ├── admin.tsx          # Panel admin untuk mengelola gambar
│   ├── login.tsx          # Halaman autentikasi admin
│   └── api/
│       ├── images.ts      # API untuk mendapatkan daftar gambar (public)
│       ├── image/[name].ts # API untuk serve gambar individual
│       ├── config.ts      # API untuk konfigurasi durasi
│       ├── upload.ts      # API untuk upload gambar
│       ├── auth.ts        # API untuk autentikasi
│       ├── logout.ts      # API untuk logout
│       └── admin/
│           ├── images.ts  # API admin untuk mengelola gambar
│           └── metadata.ts # API untuk menyimpan metadata & urutan gambar
├── components/
│   └── admin/             # Komponen UI untuk panel admin
├── hooks/                 # Custom React hooks
├── lib/
│   ├── supabase.ts       # Konfigurasi Supabase client
│   ├── auth.ts           # Utility autentikasi
│   └── database.types.ts # TypeScript types untuk database
└── styles/
    └── globals.css       # Global styles & custom scrollbar
```

### Flow Data
1. **Upload Gambar**:
   - User drag & drop file ke admin panel
   - File di-upload ke Supabase Storage via `/api/upload`
   - Metadata (durasi, urutan) disimpan ke `metadata.json`
   - Admin panel auto-refresh menampilkan gambar baru

2. **Tampilan Slideshow**:
   - `/api/images` membaca daftar file dari Supabase Storage
   - File diurutkan berdasarkan `order` array di `metadata.json`
   - `/api/image/[name]` generate signed URL untuk setiap gambar
   - Frontend auto-refresh setiap 60 detik untuk cek gambar baru
   - WebSocket connection untuk real-time sync dengan Supabase

3. **Drag & Drop Reordering**:
   - User drag gambar di admin panel untuk mengubah urutan
   - Urutan baru disimpan ke `metadata.json` via `/api/admin/metadata`
   - Slideshow otomatis mengikuti urutan baru pada refresh berikutnya

### API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/images` | GET | Mendapatkan daftar semua gambar dengan urutan | ❌ |
| `/api/image/[name]` | GET | Mendapatkan signed URL untuk gambar | ❌ |
| `/api/config` | GET | Mendapatkan konfigurasi durasi gambar | ❌ |
| `/api/admin/images` | GET | Mendapatkan daftar gambar untuk admin | ✅ |
| `/api/admin/images` | DELETE | Menghapus gambar dari storage | ✅ |
| `/api/admin/metadata` | POST | Menyimpan metadata & urutan gambar | ✅ |
| `/api/upload` | POST | Upload gambar baru ke storage | ✅ |
| `/api/auth` | POST | Login admin | ❌ |
| `/api/logout` | POST | Logout admin | ✅ |

## 💡 Tips Penggunaan

### Untuk Admin
- **Gunakan nama file yang deskriptif** agar mudah diidentifikasi di panel admin
- **Atur urutan gambar** dengan drag & drop untuk menentukan flow cerita yang tepat
- **Set durasi custom** untuk gambar yang memerlukan waktu baca lebih lama (misal: dashboard dengan banyak data)
- **Gunakan bulk selection** untuk delete beberapa gambar sekaligus dengan checkbox
- **Hindari file terlalu besar**: Maksimal ±25 MB per file agar aman di Vercel Serverless Functions
- **Format optimal**: Gunakan `.webp` atau `.avif` untuk file size lebih kecil dengan kualitas tinggi

### Untuk Display/Slideshow
- **Gunakan keyboard shortcuts** untuk kontrol cepat saat presentasi
- **Press `C`** untuk hide/show controls overlay
- **Press `Space`** untuk pause slideshow saat ingin fokus ke satu slide
- **Gunakan thumbnail grid** untuk navigasi cepat ke slide tertentu
- **Koneksi internet stabil**: Pastikan display terhubung ke network yang stabil untuk auto-refresh

### Untuk Smart TV / Digital Signage
- **Fullscreen mode**: Press `F11` di browser untuk mode fullscreen
- **Auto-reload**: Aplikasi sudah dilengkapi keep-awake feature untuk mencegah sleep mode
- **Network monitoring**: Aplikasi akan otomatis retry jika koneksi terputus
- **Multi-language**: Teks rotasi otomatis antara English, Korean, dan Indonesian

### Untuk Developer
- **Custom duration range**: Edit `DEFAULT_SLIDE_DURATION_SECONDS` di `pages/index.tsx` untuk default duration
- **Auto-refresh interval**: Edit `AUTO_REFRESH_INTERVAL_MS` untuk mengubah frekuensi check gambar baru
- **Fade transition**: Edit `FADE_DURATION_MS` untuk kecepatan transition antar slide
- **Tambah bahasa baru**: Tambahkan di `LANGUAGE_SEQUENCE` dan `translations` object
- **Custom theme**: Edit colors di `styles/globals.css` dan component styles

## 🐛 Troubleshooting

### Build Errors di Vercel

**Error:** `Missing Supabase public environment variables`
- **Penyebab**: `NEXT_PUBLIC_SUPABASE_URL` atau `NEXT_PUBLIC_SUPABASE_ANON_KEY` belum disetel di Vercel
- **Solusi**: Masukkan seluruh variabel environment ke Settings → Environment Variables dan redeploy

**Error:** `API routes gagal dengan pesan terkait bucket/tabel hilang`
- **Penyebab**: Service role key atau bucket name tidak valid
- **Solusi**: Pastikan `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, dan `SUPABASE_DURATIONS_TABLE` sudah benar

**Error:** `Module not found` atau `Cannot find module`
- **Penyebab**: Dependencies tidak terinstall dengan benar
- **Solusi**: Hapus `node_modules` dan `package-lock.json`, lalu `npm install` ulang

### Runtime Errors

**Error:** `401 Unauthorized` di admin panel
- **Penyebab**: Password admin salah atau session expired
- **Solusi**: Login ulang dengan password yang benar dari `ADMIN_PASSWORD` environment variable

**Error:** Gambar tidak muncul di slideshow
- **Penyebab**: Signed URL expired atau bucket policy salah
- **Solusi**: 
  1. Check bucket di Supabase Storage sudah public atau configured dengan benar
  2. Pastikan service role key memiliki akses ke bucket
  3. Refresh browser untuk generate signed URL baru

**Error:** Drag & drop tidak bekerja
- **Penyebab**: Browser tidak support HTML5 drag-and-drop
- **Solusi**: Gunakan browser modern (Chrome, Firefox, Safari, Edge versi terbaru)

**Error:** Auto-refresh tidak bekerja
- **Penyebab**: WebSocket connection gagal atau blocked
- **Solusi**: 
  1. Check network connection
  2. Pastikan firewall tidak block WebSocket
  3. Check browser console untuk error messages

### UI/UX Issues

**Problem:** Double scrollbar muncul
- **Solusi**: Sudah diperbaiki dengan custom scrollbar di `globals.css`

**Problem:** White space di bawah admin panel
- **Solusi**: Sudah diperbaiki dengan `min-h-screen` dan fixed gradients

**Problem:** Slideshow terlalu cepat/lambat
- **Solusi**: Atur durasi custom per gambar di admin panel (1-60 detik)

**Problem:** Controls overlay tidak muncul
- **Solusi**: Gerakkan mouse atau tekan `C` untuk toggle controls

### Performance Issues

**Problem:** Slideshow lag atau stuttering
- **Solusi**: 
  1. Compress gambar untuk reduce file size
  2. Gunakan format `.webp` atau `.avif`
  3. Check network connection speed
  4. Reduce jumlah gambar jika terlalu banyak (> 50 images)

**Problem:** Upload gambar lambat
- **Solusi**:
  1. Check ukuran file (max 25 MB)
  2. Compress gambar sebelum upload
  3. Upload satu per satu daripada bulk upload

### Smart TV / Digital Signage Issues

**Problem:** Screen goes to sleep/screensaver
- **Solusi**: Aplikasi sudah implement keep-awake feature dengan:
  - Wake Lock API
  - webOS browser keep-awake triggers (untuk LG TV dengan webOS)
  - Hidden video element trick
  - Periodic activity simulation
  - Refresh halaman jika masih terjadi

**Problem:** Keyboard controls tidak bekerja di Smart TV
- **Solusi**: Gunakan remote control atau sambungkan wireless keyboard/mouse

**Problem:** Fullscreen keluar otomatis
- **Solusi**: Tekan `F11` lagi atau gunakan browser fullscreen mode yang persistent

### webOS Browser Support

Aplikasi ini memiliki dukungan khusus untuk browser webOS di LG TV dengan multiple keep-awake strategies:

**Keep-Awake Methods (Multi-Layer):**
1. **Wake Lock API** - Screen wake lock dari browser standard
2. **webOS Luna Service** - Activity management via `com.palm.powermanager`
3. **Hidden Video Playback** - Continuous silent video untuk trick OS
4. **Activity Simulation** - Event dispatching setiap 15 menit
5. **Continuous Keep-Alive** - Trigger setiap 5 menit
6. **Fullscreen Mode** - Auto-request dan retry setiap 10 menit
7. **Auto-Reload** - Full page reload setiap 20 menit untuk reset state
8. **Video Content** - Auto-convert gambar ke video format untuk maximum keep-awake

**Video Conversion Feature (BARU!):**
- ✅ Auto-convert static images ke MP4 video on upload
- ✅ Video playback jauh lebih efektif untuk TV keep-awake
- ✅ Server-side ffmpeg conversion untuk quality terbaik
- ✅ Client-side fallback menggunakan Canvas + MediaRecorder
- ✅ Subtle zoom animation selama playback (keep-awake trick)
- ✅ Seamless integration dengan existing slideshow

**Mengapa Video Lebih Baik?**
- TV screensaver tidak trigger saat ada motion/video playback
- Video codec native support pada LG TV
- Continuous stream prevent power management activation
- Audio track (even silent) keeps system awake

**Console Logs (untuk debugging):**
- `📺 webOS browser detected - activating aggressive webOS keep-awake` - webOS terdeteksi
- `🎬 Converting image to video: [filename]` - Image conversion dimulai
- `✅ Video created: [filepath]` - Video conversion berhasil
- `🎬 Hidden video created for keep-awake` - Video hidden berhasil dibuat
- `✅ webOS activity started` - Keep-awake via Luna Service berhasil
- `⚡ Continuous keep-alive trigger` - Periodic keep-alive triggered

**Untuk pengguna LG TV:**
1. Upload gambar seperti biasa di admin panel
2. Sistem akan otomatis convert gambar ke video format
3. Video akan di-use di slideshow untuk better keep-awake
4. TV akan tetap menyala dengan maximum protection layers
5. Lihat console (F12) untuk monitoring conversion process

**Installation Requirements:**
- For server-side conversion: `ffmpeg` harus terinstall di server
  ```bash
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  
  # macOS
  brew install ffmpeg
  
  # Windows
  choco install ffmpeg
  ```
- Client-side fallback: Works di semua modern browsers dengan Canvas API support

## � Security

### Security Features
✅ **Authentication & Authorization**
- Password-based admin authentication with SHA-256 hashing
- Timing-safe token comparison to prevent timing attacks
- Secure cookie-based session management
- Authorization middleware for all admin API endpoints

✅ **Environment Variables**
- All sensitive credentials stored in `.env.local` (git-ignored)
- No hardcoded passwords, tokens, or API keys in source code
- Service role keys only used server-side (never exposed to client)
- Public anon key with Row Level Security (RLS) enabled on Supabase

✅ **HTTP Security Headers**
- `Strict-Transport-Security`: Forces HTTPS connections
- `X-Frame-Options`: Prevents clickjacking attacks
- `X-Content-Type-Options`: Prevents MIME type sniffing
- `X-XSS-Protection`: Enables browser XSS protection
- `Referrer-Policy`: Controls referrer information

✅ **Data Protection**
- No sensitive data logged in console (production)
- No stack traces exposed in API error responses
- Input validation on all API endpoints
- File type validation for uploads

### Security Checklist for Deployment

Before deploying to production, ensure:

- [ ] Change default `ADMIN_PASSWORD` to strong password (min 16 characters)
- [ ] Set strong `ADMIN_PASSWORD_SALT` (unique random string)
- [ ] Enable Supabase RLS (Row Level Security) policies
- [ ] Review and restrict Supabase Storage bucket policies
- [ ] Enable HTTPS/SSL on your deployment platform
- [ ] Set up environment variables in Vercel/hosting platform
- [ ] Never commit `.env.local` to git
- [ ] Regularly rotate passwords and API keys
- [ ] Monitor Supabase logs for suspicious activity
- [ ] Enable 2FA on Supabase account
- [ ] Backup database regularly

### Environment Variables Security

**Never expose these to client-side**:
- ❌ `ADMIN_PASSWORD`
- ❌ `ADMIN_PASSWORD_SALT`
- ❌ `SUPABASE_SERVICE_ROLE_KEY`

**Safe for client-side** (with proper RLS):
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## �🛣️ Roadmap & Future Features

- [x] Support untuk video files (mp4, webm) - Auto-convert from images
- [ ] Caption editor untuk setiap gambar
- [ ] Transition effects yang bisa dipilih (fade, slide, zoom, dll)
- [ ] Scheduling: Atur waktu tampil untuk setiap gambar
- [ ] Multi-folder organization di admin panel
- [ ] Analytics: Track berapa kali setiap slide ditampilkan
- [ ] Export/import configuration
- [ ] Mobile app untuk remote control
- [ ] Custom branding (logo, colors, fonts)
- [ ] Multi-user admin dengan role management

## 🤝 Contributing

Kontribusi sangat diterima! Silakan:
1. Fork repository ini
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 License

Project ini dibuat untuk keperluan internal. Silakan sesuaikan license sesuai kebutuhan Anda.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend & Storage
- [Vercel](https://vercel.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - Styling (dalam component styles)

---

**Selamat mencoba!** 🚀 Jika ada pertanyaan atau butuh bantuan, jangan ragu untuk membuka issue di repository ini.
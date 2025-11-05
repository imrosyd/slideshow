# Slideshow Dashboard System

Aplikasi slideshow modern berbasis Next.js dengan panel admin profesional untuk mengelola dan menampilkan dashboard secara otomatis. Dirancang khusus untuk Smart TV dan display monitor dengan fitur keep-awake untuk LG TV.

> **Last Updated**: November 5, 2025  
> **Status**: ✅ Production Ready

## 🆕 Recent Changes (v1.1.0)

### ✨ Improvements
- Removed hide/show feature for cleaner UI
- Simplified admin panel with focused features
- Improved image management workflow
- Optimized database schema for better performance
- Cleaned up codebase - removed 9 documentation files

### 🔧 What's Working
- ✅ Slideshow with smooth transitions
- ✅ Image upload & management
- ✅ Custom duration per image
- ✅ Drag & drop reordering
- ✅ Real-time sync with Supabase
- ✅ Remote control page
- ✅ LG TV keep-awake features
- ✅ Admin authentication

## ✨ Fitur Utama

### 🎬 Slideshow Display
- **Auto-rotation slideshow** dengan durasi custom per gambar (1-60 detik)
- **4 Transition effects**: Fade, Slide, Zoom, None
- **Auto-refresh** setiap 60 detik untuk sinkronisasi otomatis
- **Real-time sync** dengan Supabase Storage via WebSocket
- **Multi-language** dengan auto-rotate (English, Korean, Indonesian)
- **LG TV optimization**:
  - Wake Lock API untuk mencegah sleep mode
  - webOS browser keep-awake triggers (Luna Service API)
  - Hidden video playback untuk trick OS
  - Activity simulation setiap 15 menit
  - Continuous keep-alive setiap 5 menit
  - Auto-reload setiap 20 menit
  - Fullscreen mode retry setiap 10 menit
  - Fullscreen mode auto-request

### 🎮 Kontrol Slideshow
- **Keyboard shortcuts**:
  - `Space` - Play/Pause
  - `←/→` atau `↑/↓` - Navigate slides
  - `Home/End` - First/Last slide
  - `C` atau `ESC` - Toggle controls overlay
- **On-screen controls** dengan auto-hide (3-5 detik inactivity)
- **Transition selector** langsung dari slideshow
- **Thumbnail grid** untuk quick navigation
- **Mouse movement detection** untuk menampilkan controls

### 📱 Remote Control (Mobile-Friendly)
- **Responsive remote control page** untuk mengontrol slideshow dari device lain
- **Real-time sync** via Supabase Realtime broadcast
- **Playback controls**: Play/Pause, Previous, Next, First, Last
- **Quick jump** ke slide tertentu
- **Connection status indicator** dengan live update
- **Touch-optimized UI** dengan large buttons

### 🛠️ Admin Panel
- **Modern glassmorphism UI** dengan gradient slate background
- **Image management**:
  - Drag & drop upload dengan progress indicator
  - Drag & drop reordering untuk urutan slideshow
  - Visual numbered badges (1, 2, 3, ...)
  - Custom duration per image (1-60 detik)
- **Bulk operations**:
  - Multi-select dengan checkbox
  - Bulk set duration
  - Bulk delete with confirmation
- **Search & Filter**:
  - Search by filename
  - Sort: Order, Name, Size, Date
  - Dark mode dropdown dengan proper contrast
- **Statistics panel**:
  - Total images count
  - Total storage used
  - Real-time updates
- **Force refresh** untuk trigger update di semua slideshow
- **Toast notifications** untuk semua operasi
- **Fullscreen preview** untuk lihat image detail

### 🎨 Design System
- **Consistent color palette**:
  - Background: Slate-950 gradient
  - Accent: Sky-500 (blue) untuk primary actions
  - Secondary: Violet-500 untuk bulk actions
  - Success: Green-500
  - Warning: Amber-500
  - Error: Red-500
- **Glassmorphism effects** dengan backdrop blur
- **Smooth animations** pada semua interactions
- **Custom scrollbar** tipis dan elegan
- **Responsive layout** optimal untuk semua screen sizes
- **Loading states** dengan skeleton screens

## 🏗️ Tech Stack

- **Framework**: Next.js 14.2.33 (React 18, TypeScript)
- **Styling**: Tailwind CSS 3.4.17
- **Backend**: Supabase (Storage, Realtime, Database)
- **Deployment**: Vercel
- **UI Components**: Custom components dengan Tailwind
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Real-time**: Supabase Realtime broadcast channels

## 📁 Project Structure

```
slideshow/
├── pages/
│   ├── index.tsx           # Main slideshow display
│   ├── admin.tsx           # Admin panel
│   ├── login.tsx           # Admin login page
│   ├── remote.tsx          # Mobile remote control
│   ├── _app.tsx            # App wrapper
│   └── api/
│       ├── auth.ts         # Authentication endpoint
│       ├── logout.ts       # Logout endpoint
│       ├── images.ts       # Get images list
│       ├── upload.ts       # Upload images
│       ├── config.ts       # Legacy config endpoint
│       ├── settings.ts     # Slideshow settings (transition, etc)
│       ├── image/[name].ts # Serve individual image
│       └── admin/
│           ├── images.ts   # Admin image operations (delete, etc)
│           ├── metadata.ts # Save image metadata (order, duration, visibility)
│           └── force-refresh.ts # Trigger slideshow refresh
├── components/
│   └── admin/
│       ├── ConfirmModal.tsx   # Delete confirmation modal
│       ├── ImageCard.tsx      # Image card component
│       ├── ToastProvider.tsx  # Toast notification provider
│       └── UploadBox.tsx      # Drag & drop upload component
├── hooks/
│   ├── useImages.ts        # Image management hook
│   └── useToast.ts         # Toast notification hook
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── auth.ts             # Auth utilities
│   ├── constants.ts        # App constants
│   └── database.types.ts   # Supabase types
├── styles/
│   └── globals.css         # Global styles & Tailwind imports
└── public/                 # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ dan npm
- Akun Supabase (gratis di [supabase.com](https://supabase.com))
- Browser modern (Chrome, Firefox, Safari, Edge)

### Local Development

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd slideshow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` dan isi dengan kredensial Supabase Anda:
   ```env
   # Admin Panel Password
   ADMIN_PASSWORD=your_secure_password

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_STORAGE_BUCKET=slideshow-images
   SUPABASE_DURATIONS_TABLE=image_durations
   ```

4. **Setup Supabase** (lihat [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)):
   - Buat Storage bucket `slideshow-images`
   - Buat table `image_durations` dengan schema yang sesuai
   - Konfigurasi RLS policies
   - Enable Realtime untuk table `image_durations`

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. **Access the app**:
   - Slideshow: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Remote Control: http://localhost:3000/remote
   - Login: http://localhost:3000/login

### Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Import to Vercel**:
   - Buka [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository

3. **Configure Environment Variables**:
   
   Add the following variables in **Project Settings → Environment Variables**:
   
   | Variable | Value | Scope |
   |----------|-------|-------|
   | `ADMIN_PASSWORD` | Your admin password | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Production, Preview, Development |
   | `SUPABASE_STORAGE_BUCKET` | `slideshow-images` | Production, Preview, Development |
   | `SUPABASE_DURATIONS_TABLE` | `image_durations` | Production, Preview, Development |

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Access your app at `https://your-project.vercel.app`

> **⚠️ Important**: All environment variables must be set for all scopes. Missing variables will cause deployment to fail.

### Vercel Configuration

The project includes `vercel.json` with optimized settings:
- Build optimization enabled
- 60-second function timeout for uploads
- Proper file size limits
- SSR configuration for dynamic routes

## 📖 Usage Guide

### Admin Panel Workflow

1. **Login**:
   - Navigate to `/login`
   - Enter admin password
   - Click "Sign In"

2. **Upload Images**:
   - Drag & drop files to upload box
   - Or click to browse files
   - Supported formats: PNG, JPG, JPEG, GIF, WEBP, BMP, SVG, AVIF
   - Maximum file size: 10MB per file

3. **Manage Images**:
   - **Reorder**: Drag & drop images to change order
   - **Set Duration**: Click duration selector (1-60s)
   - **Hide/Show**: Click eye icon to toggle visibility
   - **Delete**: Click trash icon, confirm deletion
   - **Preview**: Click image for fullscreen view

4. **Bulk Operations**:
   - Click "Bulk" button to enable selection mode
   - Select multiple images
   - Choose bulk action:
     - Show selected images
     - Hide selected images
     - Set duration for all
     - Delete selected

5. **Search & Filter**:
   - Use search box to find by filename
   - Filter by: All / Visible Only / Hidden Only
   - Sort by: Order / Name / Size / Date

6. **Force Refresh**:
   - Click "🔄 Force Refresh" to update all active slideshows
   - Useful after batch updates

### Slideshow Controls

**Keyboard Shortcuts**:
- `Space` - Toggle Play/Pause
- `←` / `→` - Previous/Next slide
- `↑` / `↓` - Previous/Next slide (alternative)
- `Home` - Jump to first slide
- `End` - Jump to last slide
- `C` or `ESC` - Toggle controls overlay

**On-Screen Controls** (press C or move mouse):
- Previous/Play-Pause/Next buttons
- Transition effect selector (Fade/Slide/Zoom/None)
- Thumbnail grid for quick navigation
- Auto-hides after 3-5 seconds of inactivity

### Remote Control

1. **Access Remote**:
   - Open `/remote` on your mobile device
   - Or scan QR code from admin panel (if enabled)

2. **Control Slideshow**:
   - Use Playback controls (Play/Pause)
   - Navigate with Previous/Next buttons
   - Jump to first/last slide
   - Select specific slide from Quick Jump grid
   - Change transition effect

3. **Connection**:
   - Green dot = Connected
   - Red dot = Not connected
   - Real-time sync via Supabase

### LG TV Optimization

The slideshow includes special optimizations for LG TVs:

1. **Wake Lock API**: Prevents screen from sleeping
2. **Activity Simulation**: Triggers every 30 minutes
3. **Auto-Reload**: Full page reload every 30 minutes
4. **Fullscreen Mode**: Auto-requests after 2 seconds

**Console Logs** (check browser console):
- `🔒 Screen Wake Lock activated` - Wake lock working
- `⏰ 30-minute activity trigger` - Activity simulation
- `🔄 Auto-reloading page` - Auto-reload triggered

## 🎨 Customization

### Transition Effects

4 built-in transition effects available:
- **Fade**: Smooth opacity transition (default)
- **Slide**: Horizontal slide animation
- **Zoom**: Scale + fade effect
- **None**: Instant switch, no animation

Change via:
- Slideshow controls (press C)
- Admin panel (Slideshow Settings section - if enabled)
- Remote control page

### Default Settings

Edit constants in `pages/index.tsx`:
```typescript
const DEFAULT_SLIDE_DURATION_SECONDS = 15;  // Default duration
const LANGUAGE_SWAP_INTERVAL_MS = 4_000;    // Language rotation
const FADE_DURATION_MS = 500;               // Transition speed
const AUTO_REFRESH_INTERVAL_MS = 60_000;    // Auto-refresh interval
```

### Styling

Main style configuration in `styles/globals.css`:
- Dark theme with slate background
- Custom scrollbar
- Tailwind configuration in `tailwind.config.js`

## 🔧 Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

### Common Issues

**Images not showing**:
- Check Supabase Storage bucket configuration
- Verify RLS policies allow public read
- Check browser console for errors

**Upload fails**:
- Verify file size < 10MB
- Check supported file formats
- Ensure Supabase service role key is correct

**Slideshow not auto-updating**:
- Check Supabase Realtime is enabled
- Verify `image_durations` table exists
- Check browser console for WebSocket errors

**LG TV goes to sleep**:
- Open browser console to verify wake lock logs
- Check if fullscreen mode is active
- Wait for 30-minute auto-reload cycle

## 📄 API Reference

### GET /api/images
Returns list of all images with metadata.

**Response**:
```json
{
  "images": ["image1.jpg", "image2.png"],
  "durations": { "image1.jpg": 15000, "image2.png": 20000 },
  "captions": { "image1.jpg": null, "image2.png": null }
}
```

### POST /api/upload
Upload new images.

**Request**: multipart/form-data with file(s)

**Response**:
```json
{
  "success": true,
  "uploaded": ["new-image.jpg"],
  "skipped": []
}
```

### DELETE /api/admin/images
Delete image(s).

**Request**:
```json
{
  "filenames": ["image.jpg"]
}
```

### POST /api/admin/metadata
Save image metadata (order, duration, visibility).

**Request**:
```json
{
  "metadata": [
    { "filename": "image.jpg", "order": 1, "duration_ms": 15000, "hidden": false }
  ]
}
```

### GET/POST /api/settings
Get or update slideshow settings.

**GET Response**:
```json
{
  "transitionEffect": "fade",
  "autoRefreshInterval": 60000,
  "defaultDuration": 15000
}
```

**POST Request**:
```json
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

**Console Logs (untuk debugging):**
- `📺 webOS browser detected - activating aggressive webOS keep-awake` - webOS terdeteksi
- `🎬 Hidden video created for keep-awake` - Video hidden berhasil dibuat
- `✅ webOS activity started` - Keep-awake via Luna Service berhasil
- `⚡ Continuous keep-alive trigger` - Periodic keep-alive triggered
- `🔄 Auto-reloading page to keep LG TV awake (20 min)` - Auto-reload triggered

**Untuk pengguna LG TV:**
1. Buka `http://your-slideshow-url` di webOS browser
2. Aplikasi akan otomatis mendeteksi dan aktivasi aggressive keep-awake
3. TV akan tetap menyala dengan multiple protection layers
4. Lihat console (F12) untuk monitoring keep-awake activity
5. Jika tetap mati, check:
   - Pengaturan sleep/screensaver di LG TV diatur sangat tinggi (4+ jam)
   - Pastikan fullscreen mode aktif
   - Check console logs untuk error messages

## 🛣️ Roadmap & Future Features

- [ ] Support untuk video files (mp4, webm)
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
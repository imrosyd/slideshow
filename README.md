# Aplikasi Slideshow Otomatis

Aplikasi slideshow modern dengan panel admin profesional untuk mengelola tampilan dashboard. Aplikasi ini menampilkan semua gambar yang Anda simpan di Supabase Storage secara otomatis dalam bentuk slideshow. Setiap gambar akan tampil selama **12 detik** (atau mengikuti durasi khusus yang Anda set) sebelum berpindah ke gambar berikutnya. Ketika Anda menambahkan atau menghapus gambar lewat panel admin, aplikasi akan menyinkronkannya secara real-time.

## ✨ Fitur Utama

### 🎬 Slideshow Otomatis
- **Auto-rotation** dengan durasi per gambar yang dapat disesuaikan (1-60 detik)
- **Smooth transitions** dengan fade effect untuk pengalaman visual yang lebih baik
- **Auto-refresh** setiap 60 detik untuk memuat gambar terbaru tanpa reload manual
- **Real-time sync** dengan Supabase Storage menggunakan WebSocket
- **Multi-bahasa** dengan rotasi otomatis (English, Korean, Indonesian)
- **Keep screen awake** mencegah Smart TV/monitor masuk mode sleep saat menampilkan slideshow

### 🎮 Kontrol Interaktif
- **Keyboard shortcuts**:
  - `Space` - Play/Pause slideshow
  - `←/→` atau `↑/↓` - Navigasi slide sebelumnya/berikutnya
  - `Home/End` - Loncat ke slide pertama/terakhir
  - `C` atau `ESC` - Toggle tampilan kontrol
- **Mouse controls** dengan overlay yang muncul otomatis saat mouse bergerak
- **Thumbnail grid** untuk preview dan navigasi cepat ke slide tertentu
- **Slide info display** menampilkan nomor slide, nama file, dan durasi

### 🛠️ Panel Admin Profesional
- **Modern UI** dengan desain gradient slate-950 dan sky/violet accent
- **Drag & drop upload** gambar dengan progress indicator
- **Drag & drop reordering** untuk mengatur urutan tampilan gambar di slideshow
- **Visual feedback** saat drag (opacity & scale animation)
- **Numbered badges** menampilkan posisi setiap gambar (1, 2, 3, ...)
- **Durasi custom** untuk setiap gambar (1-60 detik)
- **Bulk operations** dengan checkbox selection
- **Delete confirmation modal** untuk mencegah penghapusan tidak sengaja
- **Toast notifications** untuk feedback operasi (sukses/error)
- **Responsive layout** dengan custom thin scrollbar
- **Auto-save metadata** menyimpan urutan dan pengaturan gambar

### 🎨 Desain & UX
- **Consistent color scheme** antara halaman login dan admin panel
- **Responsive design** optimal untuk desktop, tablet, dan mobile
- **Loading states** dengan skeleton screens dan progress indicators
- **Error handling** dengan pesan yang jelas dalam 3 bahasa
- **Custom scrollbar** tipis dan elegan untuk tampilan profesional
- **Smooth animations** pada semua interaksi UI

## 🚀 Persiapan Lokal

1. Pastikan Anda sudah menginstal **Node.js 18+** dan **npm**.
2. Clone repository dan masuk ke direktori proyek:
   ```bash
   git clone <repository-url>
   cd slideshow
   ```
3. Salin konfigurasi lingkungan:
   ```bash
   cp .env.example .env.local
   ```
4. Isi variabel environment di `.env.local` dengan kredensial Supabase Anda:
   ```env
   ADMIN_PASSWORD=your_secure_password
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_STORAGE_BUCKET=your_bucket_name
   SUPABASE_DURATIONS_TABLE=image_durations
   ```
   > **Penting:** Jangan commit file `.env.local` ke repository!

5. Instal dependensi:
   ```bash
   npm install
   ```
6. Jalankan development server:
   ```bash
   npm run dev
   ```
7. Buka browser dan akses:
   - Slideshow: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin`
   - Login Page: `http://localhost:3000/login`

> **Catatan:** Panel admin memerlukan Supabase Storage bucket yang sudah dikonfigurasi dengan benar. Format gambar yang didukung: `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `svg`, `avif`.

## 📦 Deploy ke Vercel

1. Push repository ke GitHub.
2. Buka [Vercel Dashboard](https://vercel.com) dan pilih **Add New → Project**.
3. Connect dengan repository GitHub Anda.
4. Tambahkan semua variabel environment di **Project Settings → Environment Variables**:
   
   | Variable | Description | Scope |
   |----------|-------------|-------|
   | `ADMIN_PASSWORD` | Password untuk akses admin panel | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase Anda | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key dari Supabase | Production, Preview, Development |
   | `SUPABASE_STORAGE_BUCKET` | Nama bucket di Supabase Storage | Production, Preview, Development |
   | `SUPABASE_DURATIONS_TABLE` | Nama tabel untuk durasi (default: `image_durations`) | Production, Preview, Development |

   > **⚠️ Penting:** Vercel tidak membaca `.env.local`. Jika satu saja variabel kosong, deployment akan gagal. Isi untuk semua scope (Production, Preview, Development) agar konsisten.

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
  - Hidden video element trick
  - Periodic activity simulation
  - Refresh halaman jika masih terjadi

**Problem:** Keyboard controls tidak bekerja di Smart TV
- **Solusi**: Gunakan remote control atau sambungkan wireless keyboard/mouse

**Problem:** Fullscreen keluar otomatis
- **Solusi**: Tekan `F11` lagi atau gunakan browser fullscreen mode yang persistent

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
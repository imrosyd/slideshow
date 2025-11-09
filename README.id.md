# 📺 Sistem Display Slideshow

[![Versi](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Solusi digital signage untuk TV/webOS dengan panel admin intuitif, konversi manual gambar/PDF → MP4, dan optimisasi agar layar tidak pernah sleep.

🌐 **Bahasa:** [🇺🇸 English](README.md) · 🇮🇩 Indonesia

**Pembaharuan Terakhir:** 9 November 2025 · **Status:** Siap produksi

---

## Ringkasan
Slideshow adalah aplikasi Next.js 14 + TypeScript untuk menayangkan konten TV 24/7. Admin dapat mengunggah gambar/PDF, mengatur durasi, caption, dan urutan tayang, lalu men-generate video MP4 per gambar agar pemutaran di TV webOS/LG berjalan mulus tanpa henti.

## Fitur Utama

### 🎨 Dashboard Admin (`/admin`)
**Upload & Manajemen**
- Upload drag-and-drop (JPG, PNG, GIF, PDF) langsung ke Supabase Storage
- Konversi PDF-ke-gambar dengan preview sebelum upload
- Dukungan upload massal dengan pelacakan progres
- Pencarian dan filter gambar berdasarkan nama file
- Status upload real-time dengan pelacakan per tugas

**Organisasi Gambar**
- Drag-and-drop untuk mengurutkan dengan feedback visual
- Sembunyikan/tampilkan gambar dari slideshow tanpa menghapus
- Rename file dengan preservasi ekstensi
- Hapus gambar tunggal atau multiple (bulk delete)
- Edit metadata individual (caption, durasi)

**Pembuatan Video**
- Generate MP4 per gambar manual dengan FFmpeg
- Gabungkan multiple gambar (min. 1 gambar) menjadi satu video dashboard
- Durasi kustom per gambar dalam video gabungan
- Preview dan manajemen video
- Hapus video yang di-generate sambil mempertahankan gambar sumber
- Indikator progres untuk pemrosesan video

**Operasi Massal**
- Dialog bulk edit untuk update metadata batch
- Bulk delete dengan konfirmasi
- Terapkan durasi/caption yang sama ke multiple gambar
- Toggle visibility cepat untuk multiple item

**Tools Maintenance**
- Force refresh tampilan slideshow dari jarak jauh
- Cleanup video corrupt otomatis
- Hapus file orphan dari storage
- Pengecekan konsistensi database
- Dashboard statistik cepat (total gambar, ukuran storage, jumlah video)

**Fitur UI/UX**
- Desain glassmorphism dengan efek backdrop blur
- Layout responsif untuk desktop dan tablet
- Preview gambar fullscreen saat diklik
- Pembuatan thumbnail untuk loading cepat
- Tema gelap dengan aksen gradien
- Notifikasi toast untuk semua aksi

### 📺 Pemutar Display (`/`)
**Fitur Pemutaran**
- Slideshow fullscreen dioptimasi untuk tampilan TV
- Transisi halus antar gambar/video
- Auto-advance berdasarkan durasi yang dikonfigurasi
- Buffer preload untuk playback seamless
- Retry logic untuk media yang gagal dimuat
- Auto-refresh setiap 60 detik untuk konten baru

**Manajemen Display**
- Keep display awake (Wake Lock API + webOS Power Manager)
- Cegah TV sleep dengan gerakan sintetis
- Optimisasi khusus webOS
- Mode fullscreen dengan shortcut keyboard
- Dukungan format video (MP4, WebM)

**Fitur Gallery**
- Bar gallery bawah auto-hide (muncul saat mouse mendekat)
- Zona trigger 150px dengan animasi smooth
- Layout grid dengan thumbnail gambar
- Badge premium dengan gradien
- Klik gambar untuk preview fullscreen
- Desain kartu glassmorphism

**Kontrol Keyboard**
- `Space` / `P` - Play/Pause
- `→` / `N` - Slide berikutnya
- `←` / `B` - Slide sebelumnya
- `F` - Toggle fullscreen
- `Escape` - Keluar fullscreen/preview

### 📱 Remote Control (`/remote`)
**Interface Mobile**
- Kontrol dioptimasi sentuh untuk smartphone/tablet
- Tombol besar, mudah diketuk
- Sinkronisasi real-time dengan display via Supabase Realtime
- Akses QR code dari dashboard admin

**Fitur Kontrol**
- Toggle Play/Pause
- Navigasi Next/Previous
- Tampilan informasi slide saat ini
- Indikator status koneksi
- Desain responsif untuk semua ukuran layar

**Komunikasi Realtime**
- Sinkronisasi WebSocket bi-directional
- Propagasi command instan
- Update status dari display
- Channel heartbeat untuk koneksi reliable
- Auto-reconnect saat disconnect

### 🔒 Keamanan & Keandalan
**Autentikasi**
- Akses admin terproteksi password
- Sesi cookie HTTP-only
- Otorisasi API berbasis token
- Validasi server-side

**Keamanan Database**
- Supabase Row Level Security (RLS) policies
- Service role hanya untuk operasi admin
- Anon key untuk akses baca publik
- Kebijakan RLS yang telah diuji (`test-rls.html`)

**Penanganan Error**
- Degradasi graceful saat failure
- Retry otomatis untuk error transient
- Deteksi dan cleanup video corrupt
- Cleanup file orphan
- Logging error komprehensif

### ⚙️ Fitur Teknis
**Performa**
- Encoding FFmpeg teroptimasi (H.264, yuv420p)
- Sharp untuk pembuatan thumbnail
- Preloading gambar untuk transisi smooth
- Lazy loading untuk komponen admin
- Resource hints untuk loading lebih cepat

**Monitoring**
- Pelacakan task upload
- Progres pembuatan video
- Statistik penggunaan storage
- Jumlah gambar aktif
- Update status real-time

## Arsitektur & Stack
- **Frontend:** Next.js 14, React 18, Tailwind CSS (UI glassmorphism)
- **Backend:** Next.js API Routes + Supabase (PostgreSQL, Storage, Realtime)
- **Pemrosesan Media:** FFmpeg via `@ffmpeg-installer/ffmpeg`
- **Deployment:** Siap Vercel atau server Node.js sendiri

## Langkah Mulai Cepat
### Prasyarat
- Node.js 18+
- npm atau yarn
- Proyek Supabase (URL, anon key, service role key)

### Instalasi
```bash
git clone https://github.com/imrosyd/slideshow.git
cd slideshow
npm install

cp .env.example .env.local
# isi dengan kredensial Supabase Anda

npm run dev        # http://localhost:3000 (fallback 3001)
# produksi: npm run build && npm start
```

## Variabel Lingkungan
| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `ADMIN_PASSWORD` | ✅ | Password login `/admin` (hanya server) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase (aman di client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key Supabase (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (khusus server) |
| `SUPABASE_STORAGE_BUCKET` | ⬜️ | Nama bucket kustom (default `slideshow-images`) |
| `SUPABASE_DURATIONS_TABLE` | ⬜️ | Nama tabel kustom durasi (default `image_durations`) |

## Setup Supabase
1. **Bucket Storage:** buat `slideshow-images` dan `slideshow-videos`.
2. **Migrasi SQL:** jalankan berurutan berkas `001` s/d `004` di folder `supabase/`.
3. **Kebijakan Storage:** izinkan `SELECT` publik di kedua bucket, beri akses penuh untuk service role.
4. **Tes RLS:** buka `test-rls.html`, isi URL & anon key, klik *Initialize* → *Run All Tests* hingga semuanya PASS.

## Cara Pakai
- `/` — pemutar slideshow fullscreen (TV/webOS)
- `/admin` — dashboard untuk upload, edit metadata, generate video
- `/remote` — remote control berbasis web dengan sinkronisasi real-time

## Opsi Encoding Lanjutan
Atur nilai di tabel `slideshow_settings` untuk mengubah parameter FFmpeg tanpa build ulang:

| Kunci | Default | Catatan |
|-------|---------|---------|
| `video_crf` | `22` | Kualitas (lebih kecil = lebih bagus, file lebih besar) |
| `video_preset` | `veryfast` | Kecepatan encoding (`ultrafast` … `veryslow`) |
| `video_profile` | `high` | Profil H.264 (`baseline`, `main`, `high`) |
| `video_level` | `4.0` | Level H.264 (3.1, 4.0, 4.2, …) |
| `video_fps` | `24` | Frame per detik |
| `video_gop` | `48` | Interval keyframe (default 2 × fps) |
| `video_width` | `1920` | Lebar output (rasio dijaga via scale+pad) |
| `video_height` | `1080` | Tinggi output (rasio dijaga via scale+pad) |

## Skrip yang Tersedia
| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan server pengembangan Next.js |
| `npm run build` | Build untuk produksi |
| `npm start` | Menjalankan server produksi |
| `npm run lint` | ESLint + pengecekan TypeScript |

## Troubleshooting
**Playback & UI**

| Masalah | Solusi |
|---------|--------|
| Layar TV sleep/blank | Pastikan video H.264+yuv420p (default sudah), cek log keep-awake, koneksi stabil |
| Video tidak start di webOS | Pastikan durasi ≥2 detik, cek `ffmpeg -i file.mp4`, lihat console untuk deteksi webOS |
| Peringatan fullscreen | Browser butuh gesture user — klik/tap sekali |
| Peringatan Supabase Realtime | Sudah diperbaiki sejak v1.3 dengan `httpSend()`, aman di versi terbaru |

**Database & RLS**

| Masalah | Solusi |
|---------|--------|
| Policy tidak berjalan | Jalankan ulang `004_enable_row_level_security.sql`, pastikan RLS aktif, gunakan `test-rls.html` |
| Service role upload error | Cek kembali `SUPABASE_SERVICE_ROLE_KEY`; jangan pernah diekspos ke client |

## Pembaruan Terbaru (v2.1.0)
- **Peningkatan Merge to Video**: Dikurangi minimum gambar dari 2 menjadi 1 untuk konversi video gambar tunggal
- Desain UI glassmorphism dengan gallery auto-hide dan preview fullscreen
- MP4 individual per gambar dengan trigger manual (tanpa generasi batch)
- Operasi bulk yang ditingkatkan dengan dialog bulk edit dan pencarian/filter
- Dukungan konversi PDF-ke-gambar
- Tools force refresh dan cleanup untuk maintenance
- Perbaikan bug double-transition dengan fallback timeout preload
- Keep-awake & transisi ditingkatkan untuk TV webOS
- Keamanan komprehensif dengan kebijakan RLS yang telah diuji

## Catatan Tambahan
- Riwayat lengkap: [CHANGELOG.md](CHANGELOG.md)
- Lisensi: [MIT](LICENSE)
- Pembuat: **Imron** ([@imrosyd](https://github.com/imrosyd))

---

Dibuat dengan ❤️ untuk dashboard slideshow tanpa henti.

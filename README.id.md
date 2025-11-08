# 📺 Sistem Display Slideshow

[![Versi](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Solusi digital signage untuk TV/webOS dengan panel admin intuitif, konversi manual gambar/PDF → MP4, dan optimisasi agar layar tidak pernah sleep.

🌐 **Bahasa:** [🇺🇸 English](README.md) · 🇮🇩 Indonesia

**Pembaharuan Terakhir:** 8 November 2025 · **Status:** Siap produksi

---

## Ringkasan
Slideshow adalah aplikasi Next.js 14 + TypeScript untuk menayangkan konten TV 24/7. Admin dapat mengunggah gambar/PDF, mengatur durasi, caption, dan urutan tayang, lalu men-generate video MP4 per gambar agar pemutaran di TV webOS/LG berjalan mulus tanpa henti.

## Fitur Utama
- **Panel Admin**
  - Upload drag-and-drop langsung ke Supabase Storage
  - Edit nama file, caption, durasi, urutan, status tampil, serta hapus konten
  - Generate MP4 per gambar memakai FFmpeg (libx264, yuv420p, aman untuk webOS)
  - Preview & konversi PDF ke gambar sebelum dipublikasikan
- **Pemutar Display**
  - Playlist loop tanpa jeda dengan retry logic, preload buffer, dan keep-awake (Wake Lock + webOS Power Manager)
  - Auto refresh setiap 60 detik, transisi halus, fullscreen + dukungan keyboard
- **Kontrol Jarak Jauh & On-screen**
  - Halaman `/remote` untuk play/pause/next/previous dengan sinkronisasi real-time
  - Kontrol mengambang di layar (muncul saat mouse bergerak, auto-hide, 3 tombol utama)
- **Keandalan & Keamanan**
  - RLS Supabase sudah diuji (`test-rls.html`)
  - Service role hanya dipakai di server, ada pembersihan otomatis file corrupt/orphan

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

## Pembaruan Terbaru
- MP4 individual per gambar dengan tombol manual (tanpa batch)
- Perbaikan double transition dengan timeout preload
- Keep-awake & transisi semakin stabil untuk TV webOS
- Struktur dokumentasi & panduan troubleshooting diperbarui

## Catatan Tambahan
- Riwayat lengkap: [CHANGELOG.md](CHANGELOG.md)
- Lisensi: [MIT](LICENSE)
- Pembuat: **Imron** ([@imrosyd](https://github.com/imrosyd))

---

Dibuat dengan ❤️ untuk dashboard slideshow tanpa henti.

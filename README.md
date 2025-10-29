# Aplikasi Slideshow Otomatis

Aplikasi ini menampilkan semua gambar yang Anda simpan di Supabase Storage secara otomatis dalam bentuk slideshow. Setiap gambar akan tampil selama **12 detik** (atau mengikuti durasi khusus yang Anda set di Supabase) sebelum berpindah ke gambar berikutnya. Ketika Anda menambahkan atau menghapus gambar lewat panel admin, aplikasi akan menyinkronkannya dari Supabase.

## Persiapan Lokal

1. Pastikan Anda sudah menginstal Node.js 18+.
2. Salin konfigurasi lingkungan:
   ```bash
   cp .env.example .env.local
   ```
   Lalu isi setiap variabel dengan kredensial Supabase dan kata sandi admin yang disimpan aman (jangan commit file `.env.local`).
3. Instal dependensi sekali saja:
   ```bash
   npm install
   ```
4. Jalankan pengembangan lokal:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:3000` di browser.

> **Catatan:** Panel admin (`/admin`) memanfaatkan Supabase Storage. Pastikan bucket yang Anda gunakan sudah dibuat dan diizinkan untuk upload oleh service role Supabase. Format gambar yang didukung: `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `svg`, `avif`.

## Deploy ke Vercel

1. Push repository ini ke GitHub.
2. Di dashboard Vercel, pilih **Add New → Project** dan hubungkan dengan repository tersebut.
3. Tambahkan semua variabel environment dari `.env.local` ke Project Settings → Environment Variables (jangan simpan kredensial di repo).
4. Biarkan pengaturan build default (`npm install`, `npm run build`) dan produknya `npm start`.
5. Set *Root Directory* ke `slideshow` (atau nama folder proyek ini).
6. Deploy. Setiap commit baru akan otomatis memicu deploy ulang.

## Cara Kerja

- `/api/images` membaca daftar file gambar dari Supabase Storage.
- `/api/image/[name]` membuat signed URL Supabase untuk gambar sehingga frontend bisa menampilkannya tanpa menyalin ke `public`.
- Halaman utama mengambil daftar tersebut dan memutar gambar secara otomatis setiap 60 detik, dengan indikator progres di bagian bawah.

## Tips

- Gunakan nama file unik agar lebih mudah diidentifikasi di tampilan caption.
- Hindari menaruh gambar yang terlalu besar; unggahan dibatasi ±25 MB per file agar aman di Vercel Serverless Functions.
- Jika Anda ingin menampilkan gambar dari subfolder, sesuaikan logic di `pages/api/images.ts`.

Selamat mencoba! Jika butuh fitur tambahan (misalnya tombol navigasi, durasi dinamis, atau dukungan folder), tinggal lanjutkan dari struktur ini. 

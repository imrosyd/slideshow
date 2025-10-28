# Aplikasi Slideshow Otomatis

Aplikasi ini menampilkan semua gambar yang Anda simpan di direktori root proyek (sejajar dengan `package.json`) secara otomatis dalam bentuk slideshow. Setiap gambar akan tampil selama **1 menit** sebelum berpindah ke gambar berikutnya. Ketika Anda menambahkan atau menghapus gambar, cukup lakukan commit dan push ke GitHub; Vercel akan membangun ulang aplikasi dan daftar gambar akan ikut diperbarui.

## Persiapan Lokal

1. Pastikan Anda sudah menginstal Node.js 18+.
2. Instal dependensi sekali saja:
   ```bash
   npm install
   ```
3. Jalankan pengembangan lokal:
   ```bash
   npm run dev
   ```
4. Buka `http://localhost:3000` di browser.

> **Catatan:** Letakkan file gambar langsung di folder root proyek. Contoh: `slideshow/holiday.jpg`. Format yang didukung: `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `svg`, `avif`.

## Deploy ke Vercel

1. Push repository ini ke GitHub.
2. Di dashboard Vercel, pilih **Add New → Project** dan hubungkan dengan repository tersebut.
3. Biarkan pengaturan build default (`npm install`, `npm run build`) dan produknya `npm start`.
4. Set *Root Directory* ke `slideshow` (atau nama folder proyek ini).
5. Deploy. Setiap commit baru akan otomatis memicu deploy ulang.

## Cara Kerja

- `/api/images` membaca isi direktori root dan mengembalikan daftar nama file gambar.
- `/api/image/[name]` melayani data biner gambar sehingga frontend bisa menampilkannya tanpa perlu memindahkan file ke `public`.
- Halaman utama mengambil daftar tersebut dan memutar gambar secara otomatis setiap 60 detik, dengan indikator progres di bagian bawah.

## Tips

- Gunakan nama file unik agar lebih mudah diidentifikasi di tampilan caption.
- Hindari menaruh gambar yang terlalu besar untuk menjaga waktu build Vercel.
- Jika Anda ingin menampilkan gambar dari subfolder, sesuaikan logic di `pages/api/images.ts`.

Selamat mencoba! Jika butuh fitur tambahan (misalnya tombol navigasi, durasi dinamis, atau dukungan folder), tinggal lanjutkan dari struktur ini. 

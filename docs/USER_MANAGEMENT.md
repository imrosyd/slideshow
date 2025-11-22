# 👥 User Management Guide

Panduan lengkap untuk mengelola user di aplikasi Slideshow.

## 📋 Daftar Perintah

| Perintah | Fungsi | Contoh |
|----------|--------|--------|
| `npm run add-user` | Menambah user baru | `npm run add-user john pass123 viewer` |
| `npm run list-users` | Melihat semua user | `npm run list-users` |
| `npm run delete-user` | Menghapus user | `npm run delete-user <user-id>` |
| `npm run update-role` | Mengubah role user | `npm run update-role <user-id>` |
| `npm run check-role` | Cek role user | `npm run check-role <username>` |

---

## 1️⃣ Menambah User Baru

### Sintaks:
```bash
npm run add-user <username> <password> [role]
```

### Parameter:
- `username` - Nama user (wajib)
- `password` - Password user (wajib)
- `role` - Role user: `admin` atau `viewer` (opsional, default: `viewer`)

### Contoh:

**Menambah viewer (user biasa):**
```bash
npm run add-user john mypassword123
```

**Menambah admin:**
```bash
npm run add-user superadmin admin123 admin
```

**Menambah viewer dengan role eksplisit:**
```bash
npm run add-user viewer1 pass123 viewer
```

### Output:
```
✅ User created successfully!

📋 User Details:
   ID:       194a39bc-987a-423c-bca8-57943a3b4870
   Username: john
   Role:     viewer
   Created:  2025-11-22T08:34:21.000Z

🔐 Login credentials:
   Username: john
   Password: mypassword123
```

---

## 2️⃣ Melihat Semua User

### Sintaks:
```bash
npm run list-users
```

### Contoh:
```bash
npm run list-users
```

### Output:
```
👥 All Users:
════════════════════════════════════════════════════════════════════════════════

1. admin
   ID:      194a39bc-987a-423c-bca8-57943a3b4870
   Role:    👑 Admin
   Created: 11/22/2025, 8:34:21 AM
   Updated: 11/22/2025, 8:34:21 AM

2. john
   ID:      294b49cd-098b-534d-cdb9-68054b4c5981
   Role:    👤 Viewer
   Created: 11/22/2025, 9:15:30 AM
   Updated: 11/22/2025, 9:15:30 AM

════════════════════════════════════════════════════════════════════════════════
Total: 2 user(s)
```

---

## 3️⃣ Menghapus User

### Sintaks:
```bash
npm run delete-user <user-id>
```

### Langkah:
1. Jalankan `npm run list-users` untuk melihat ID user
2. Copy ID user yang ingin dihapus
3. Edit file `scripts/delete-user.ts` dan ganti `userId` dengan ID yang ingin dihapus
4. Jalankan `npm run delete-user`

### Contoh:
```bash
# 1. Lihat daftar user
npm run list-users

# 2. Edit scripts/delete-user.ts
# Ganti: const userId = '194a39bc-987a-423c-bca8-57943a3b4870';

# 3. Jalankan delete
npm run delete-user
```

---

## 4️⃣ Mengubah Role User

### Sintaks:
```bash
npm run update-role <user-id>
```

### Langkah:
1. Jalankan `npm run list-users` untuk melihat ID user
2. Copy ID user yang ingin diubah
3. Edit file `scripts/update-role.ts` dan ganti `userId` dengan ID yang ingin diubah
4. Ubah `role` menjadi `admin` atau `viewer`
5. Jalankan `npm run update-role`

### Contoh:
```bash
# 1. Lihat daftar user
npm run list-users

# 2. Edit scripts/update-role.ts
# Ganti: const userId = '194a39bc-987a-423c-bca8-57943a3b4870';
# Ganti: data: { role: 'admin' },

# 3. Jalankan update
npm run update-role
```

---

## 5️⃣ Cek Role User

### Sintaks:
```bash
npm run check-role <username>
```

### Langkah:
1. Edit file `scripts/check-role.ts` dan ganti `username`
2. Jalankan `npm run check-role`

---

## 🔐 Perbedaan Role

### Admin
- Akses penuh ke `/admin` dashboard
- Dapat upload, edit, delete gambar
- Dapat generate video
- Dapat force refresh display
- Dapat approve login attempts

### Viewer
- Hanya dapat melihat slideshow di `/`
- Dapat menggunakan remote control di `/remote`
- Tidak dapat mengakses admin dashboard

---

## 💡 Tips

### Reset Password Admin
Jika lupa password admin, gunakan environment variable:

```bash
# Edit .env
ADMIN_PASSWORD=newpassword123

# Jalankan seed untuk update password
npx prisma db seed
```

### Membuat User Pertama Kali
Saat instalasi pertama, user admin otomatis dibuat oleh `npx prisma db seed` dengan:
- Username: `admin`
- Password: dari `ADMIN_PASSWORD` di `.env`

### Backup User Data
```bash
# Export semua user
pg_dump -U slideshow_user -t profiles slideshow_db > users_backup.sql

# Restore user data
psql -U slideshow_user slideshow_db < users_backup.sql
```

---

## ⚠️ Troubleshooting

### Error: "User already exists"
User dengan username tersebut sudah ada. Gunakan username lain atau hapus user lama terlebih dahulu.

### Error: "Role must be either admin or viewer"
Pastikan parameter role adalah `admin` atau `viewer` (huruf kecil).

### Error: "DATABASE_URL not found"
Pastikan file `.env` ada dan berisi `DATABASE_URL`. Lihat `.env.example` untuk contoh.

### Error: "Cannot find module '@prisma/client'"
Jalankan:
```bash
npm install
npx prisma generate
```

---

## 📚 Referensi

- [README.md](../README.md) - Dokumentasi utama
- [CHANGELOG.md](../CHANGELOG.md) - Riwayat perubahan
- [prisma/schema.prisma](../prisma/schema.prisma) - Database schema

---

**Dibuat:** 2025-11-22  
**Versi:** 1.0.0

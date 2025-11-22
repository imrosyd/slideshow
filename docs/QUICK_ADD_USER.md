# 🚀 Quick Start - Menambah User

## Cara Tercepat Menambah User

### 1. Menambah User Viewer (Biasa)
```bash
npm run add-user <username> <password>
```

**Contoh:**
```bash
npm run add-user john password123
```

### 2. Menambah User Admin
```bash
npm run add-user <username> <password> admin
```

**Contoh:**
```bash
npm run add-user superadmin admin123 admin
```

### 3. Lihat Semua User
```bash
npm run list-users
```

---

## 📝 Contoh Lengkap

```bash
# 1. Lihat user yang ada
npm run list-users

# 2. Tambah user viewer
npm run add-user viewer1 pass123

# 3. Tambah user admin
npm run add-user admin2 admin456 admin

# 4. Lihat hasil
npm run list-users
```

---

## ✅ Output Sukses

Ketika berhasil menambah user, Anda akan melihat:

```
✅ User created successfully!

📋 User Details:
   ID:       d8af7b99-2d31-4d6d-b4ed-f0795318104a
   Username: viewer1
   Role:     viewer
   Created:  Sat Nov 22 2025 08:36:14 GMT+0700

🔐 Login credentials:
   Username: viewer1
   Password: password123
```

---

## 📚 Dokumentasi Lengkap

Untuk panduan lengkap, lihat: [docs/USER_MANAGEMENT.md](./USER_MANAGEMENT.md)

---

## ⚡ Perintah Lainnya

| Perintah | Fungsi |
|----------|--------|
| `npm run add-user <user> <pass> [role]` | Tambah user baru |
| `npm run list-users` | Lihat semua user |
| `npm run delete-user` | Hapus user |
| `npm run update-role` | Ubah role user |
| `npm run check-role` | Cek role user |

---

**Catatan:** 
- Role default adalah `viewer` jika tidak disebutkan
- Role yang tersedia: `admin` atau `viewer`
- Password minimal 6 karakter (recommended)

# 🎯 Quick Start: Interactive Seeding

## Untuk Instalasi Baru (Belum Ada Admin)

Ketika Anda menjalankan `npx prisma db seed` untuk pertama kali:

```bash
cd /path/to/slideshow
npx prisma db seed
```

**Output:**
```
🚀 Slideshow Database Seeding

═══════════════════════════════════════════════════════════
📝 No admin user found. Let's create one!

👤 Enter admin username (default: admin): 
```

### Opsi 1: Custom Username & Password (Recommended)

```
👤 Enter admin username (default: admin): myusername
🔒 Enter admin password (default: admin): MySecurePassword123
🔒 Confirm password: MySecurePassword123

⏳ Creating admin user...

✅ Admin user created successfully!
═══════════════════════════════════════════════════════════
   Username: myusername
   Role:     admin
   ID:       550e8400-e29b-41d4-a716-446655440000
═══════════════════════════════════════════════════════════

💡 You can now login with these credentials
💡 Use "npm run add-user" to create additional users
```

### Opsi 2: Menggunakan Default (admin/admin)

Cukup tekan Enter tanpa mengetik apa-apa:

```
👤 Enter admin username (default: admin): [Enter]
🔒 Enter admin password (default: admin): [Enter]
⚠️  Using default password: admin
🔒 Confirm password: [Enter]

⏳ Creating admin user...

✅ Admin user created successfully!
═══════════════════════════════════════════════════════════
   Username: admin
   Role:     admin
   ID:       550e8400-e29b-41d4-a716-446655440000
═══════════════════════════════════════════════════════════
```

---

## Untuk Instalasi yang Sudah Ada Admin

Jika database sudah memiliki admin user, seed akan skip:

```bash
npx prisma db seed
```

**Output:**
```
🚀 Slideshow Database Seeding

═══════════════════════════════════════════════════════════
✅ Admin user already exists:
   Username: admin
   Role:     admin

💡 Tip: Use "npm run add-user" to create additional users
═══════════════════════════════════════════════════════════
```

---

## Tips

### 🔒 Keamanan Password
- Password tidak terlihat saat Anda mengetik
- Ditampilkan sebagai `*` untuk keamanan
- Gunakan Backspace untuk menghapus karakter

### ✅ Validasi
- Username minimum 3 karakter
- Password minimum 4 karakter
- Password harus sama dengan konfirmasi

### 🚀 Production Deployment

Untuk VPS/Server production:

```bash
# 1. Setup database
npx prisma db push

# 2. Create admin dengan credentials kuat
npx prisma db seed
# Masukkan username dan password yang kuat!

# 3. Build dan jalankan
npm run build
pm2 start npm --name slideshow -- start
```

### 🔄 Menambah User Lain

Setelah admin pertama dibuat, gunakan script add-user:

```bash
# Tambah viewer
npm run add-user john password123 viewer

# Tambah admin lain
npm run add-user jane password456 admin
```

---

## Troubleshooting

### Error: "Username must be at least 3 characters long"
Username Anda terlalu pendek. Gunakan minimal 3 karakter.

### Error: "Password must be at least 4 characters long"
Password Anda terlalu pendek. Gunakan minimal 4 karakter.

### Error: "Passwords do not match"
Password dan konfirmasi tidak sama. Coba lagi dengan hati-hati.

### Error: "Username already exists"
Username sudah digunakan. Pilih username lain.

---

## Video Demo

Lihat video demo di: [docs/interactive-seeding-demo.mp4](./interactive-seeding-demo.mp4)

Atau jalankan sendiri:
```bash
cd /home/imron/project/slideshow
npx prisma db seed
```

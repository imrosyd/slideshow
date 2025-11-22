# 🔐 Interactive Database Seeding

## Deskripsi

Fitur **Interactive Seeding** memungkinkan Anda untuk membuat admin user pertama dengan username dan password custom melalui prompt interaktif di terminal, bukan menggunakan nilai default yang hardcoded.

## Mengapa Fitur Ini Penting?

### ❌ Sebelumnya (Hardcoded)
```typescript
const username = 'admin';
const password = 'admin'; // Default password - TIDAK AMAN!
```

**Masalah:**
- Username dan password default (`admin`/`admin`) dapat ditebak dengan mudah
- Harus edit kode untuk mengubah credentials
- Tidak aman untuk production
- Credentials terbuka di source code

### ✅ Sekarang (Interactive)
```bash
npx prisma db seed

👤 Enter admin username (default: admin): myusername
🔒 Enter admin password (default: admin): ********
🔒 Confirm password: ********
```

**Keuntungan:**
- ✅ Username dan password custom sejak awal
- ✅ Password tersembunyi saat mengetik (security)
- ✅ Konfirmasi password untuk mencegah typo
- ✅ Validasi otomatis (panjang minimum, duplikat)
- ✅ Lebih aman untuk production
- ✅ Tidak perlu edit kode

---

## Cara Menggunakan

### 1. Setup Database Pertama Kali

```bash
# 1. Push schema ke database
npx prisma db push

# 2. Jalankan seed (akan muncul prompt interaktif)
npx prisma db seed
```

### 2. Contoh Sesi Interaktif

```
🚀 Slideshow Database Seeding

═══════════════════════════════════════════════════════════
📝 No admin user found. Let's create one!

👤 Enter admin username (default: admin): superadmin
🔒 Enter admin password (default: admin): MySecureP@ss123
🔒 Confirm password: MySecureP@ss123

⏳ Creating admin user...

✅ Admin user created successfully!
═══════════════════════════════════════════════════════════
   Username: superadmin
   Role:     admin
   ID:       550e8400-e29b-41d4-a716-446655440000
═══════════════════════════════════════════════════════════

💡 You can now login with these credentials
💡 Use "npm run add-user" to create additional users
```

### 3. Jika Admin Sudah Ada

Jika sudah ada admin user di database, seed akan skip:

```
🚀 Slideshow Database Seeding

═══════════════════════════════════════════════════════════
✅ Admin user already exists:
   Username: superadmin
   Role:     admin

💡 Tip: Use "npm run add-user" to create additional users
═══════════════════════════════════════════════════════════
```

---

## Fitur

### 🔒 Password Tersembunyi
Password tidak ditampilkan saat Anda mengetik, melainkan diganti dengan `*`:
```
🔒 Enter admin password: ********
```

**Keyboard Controls:**
- Ketik password → Muncul `*`
- Backspace → Hapus karakter terakhir
- Enter → Submit
- Ctrl+C → Cancel

### ✅ Validasi Otomatis

#### Username
- ✅ Minimum 3 karakter
- ✅ Cek duplikat (tidak boleh sama dengan user lain)
- ✅ Trim whitespace otomatis

#### Password
- ✅ Minimum 4 karakter
- ✅ Konfirmasi password harus sama
- ✅ Hash dengan bcrypt (10 rounds)

### 🎯 Default Values

Jika Anda tidak memasukkan apa-apa (langsung Enter), akan menggunakan default:
- Username: `admin`
- Password: `admin`

```
👤 Enter admin username (default: admin): [Enter]
🔒 Enter admin password (default: admin): [Enter]
⚠️  Using default password: admin
🔒 Confirm password: [Enter]
```

---

## Error Handling

### Username Terlalu Pendek
```
👤 Enter admin username (default: admin): ab
❌ Username must be at least 3 characters long
```

### Username Sudah Ada
```
👤 Enter admin username (default: admin): admin
❌ Username 'admin' already exists
```

### Password Terlalu Pendek
```
🔒 Enter admin password (default: admin): 123
❌ Password must be at least 4 characters long
```

### Password Tidak Cocok
```
🔒 Enter admin password (default: admin): password123
🔒 Confirm password: password456
❌ Passwords do not match
```

---

## Implementasi Teknis

### File: `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
const bcrypt = require('bcrypt');

// 1. Cek apakah admin sudah ada
const existingAdmin = await prisma.profile.findFirst({
    where: { role: 'admin' },
});

if (existingAdmin) {
    // Skip jika sudah ada
    return;
}

// 2. Buat readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// 3. Prompt username
let username = await question(rl, '👤 Enter admin username: ');

// 4. Prompt password (hidden)
let password = await questionPassword(rl, '🔒 Enter admin password: ');

// 5. Konfirmasi password
const confirmPassword = await questionPassword(rl, '🔒 Confirm password: ');

// 6. Validasi
if (password !== confirmPassword) {
    throw new Error('Passwords do not match');
}

// 7. Hash dan simpan
const hashedPassword = await bcrypt.hash(password, 10);
await prisma.profile.create({
    data: { username, password: hashedPassword, role: 'admin' }
});
```

### Fungsi `questionPassword` (Hidden Input)

Menggunakan raw mode untuk menyembunyikan input:

```typescript
function questionPassword(rl: readline.Interface, query: string): Promise<string> {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        
        // Enable raw mode (karakter tidak ditampilkan)
        (stdin as any).setRawMode(true);
        
        let password = '';
        
        stdin.on('data', (char: Buffer) => {
            const str = char.toString('utf8');
            
            if (str === '\n' || str === '\r') {
                // Enter pressed
                resolve(password);
            } else if (str === '\u007f') {
                // Backspace pressed
                password = password.slice(0, -1);
                process.stdout.write('\b \b');
            } else {
                // Normal character
                password += str;
                process.stdout.write('*'); // Tampilkan *
            }
        });
    });
}
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────┐
│  npx prisma db seed                     │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Cek: Apakah admin sudah ada?           │
└───────────┬─────────────┬───────────────┘
            │             │
         Ya │             │ Tidak
            │             │
            ▼             ▼
    ┌───────────┐   ┌─────────────────────┐
    │   Skip    │   │  Prompt Username    │
    │  Seeding  │   └──────────┬──────────┘
    └───────────┘              │
                               ▼
                    ┌─────────────────────┐
                    │  Validasi Username  │
                    │  (min 3 char)       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Cek Duplikat       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Prompt Password    │
                    │  (hidden input)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Validasi Password  │
                    │  (min 4 char)       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Confirm Password   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Passwords Match?   │
                    └──────┬──────┬───────┘
                           │      │
                        Ya │      │ Tidak
                           │      │
                           ▼      ▼
                    ┌──────────┐ ┌─────┐
                    │  Hash    │ │Error│
                    │  bcrypt  │ └─────┘
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────────────┐
                    │  Simpan ke DB    │
                    └────┬─────────────┘
                         │
                         ▼
                    ┌──────────────────┐
                    │  ✅ Success!     │
                    └──────────────────┘
```

---

## FAQ

### Q: Bagaimana jika saya ingin menggunakan default (admin/admin)?
**A:** Cukup tekan Enter tanpa mengetik apa-apa:
```
👤 Enter admin username (default: admin): [Enter]
🔒 Enter admin password (default: admin): [Enter]
⚠️  Using default password: admin
🔒 Confirm password: [Enter]
```

### Q: Apakah password saya aman?
**A:** Ya! Password:
- Tidak ditampilkan saat mengetik (hidden input)
- Di-hash dengan bcrypt (10 rounds) sebelum disimpan
- Tidak pernah disimpan dalam bentuk plain text

### Q: Bagaimana jika saya salah ketik password?
**A:** Gunakan Backspace untuk menghapus karakter, atau Ctrl+C untuk cancel dan mulai ulang.

### Q: Apakah saya bisa menjalankan seed berkali-kali?
**A:** Ya, tapi jika admin sudah ada, seed akan skip otomatis. Gunakan `npm run add-user` untuk menambah user baru.

### Q: Bagaimana cara reset admin password?
**A:** Gunakan script `npm run update-role` atau edit langsung di database dengan Prisma Studio:
```bash
npx prisma studio
```

---

## Keamanan

### ✅ Best Practices yang Diterapkan

1. **Password Hashing**: Menggunakan bcrypt dengan 10 salt rounds
2. **Hidden Input**: Password tidak terlihat saat mengetik
3. **Password Confirmation**: Mencegah typo
4. **Validation**: Minimum length requirements
5. **No Hardcoded Credentials**: Tidak ada credentials di source code
6. **Duplicate Check**: Mencegah username duplikat

### ⚠️ Rekomendasi Production

Untuk production, gunakan password yang kuat:
- ✅ Minimum 12 karakter
- ✅ Kombinasi huruf besar, kecil, angka, simbol
- ✅ Tidak menggunakan kata-kata umum
- ✅ Unik (tidak digunakan di tempat lain)

**Contoh password kuat:**
```
MyS3cur3P@ssw0rd!2024
Sl1d3sh0w#Adm1n$2024
```

---

## Changelog

### Version 3.3.0 (2025-11-22)
- ✨ **NEW**: Interactive database seeding dengan custom username/password
- ✨ **NEW**: Hidden password input untuk keamanan
- ✨ **NEW**: Password confirmation untuk mencegah typo
- ✨ **NEW**: Validasi otomatis (minimum length, duplikat)
- 🔒 **SECURITY**: Tidak lagi menggunakan hardcoded credentials
- 📝 **DOCS**: Dokumentasi lengkap interactive seeding

---

## Lihat Juga

- [User Management Guide](./user-management.md)
- [Security Best Practices](./security.md)
- [Deployment Guide](../README.md)

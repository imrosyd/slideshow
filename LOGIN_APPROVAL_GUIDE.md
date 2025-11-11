# Login Approval System Guide

## 🔄 Flow Login Approval Baru

### Cara Kerja:
1. **Browser Lama (Sudah Login)** → Tetap aktif, akan muncul dialog
2. **Browser Baru (Mau Login)** → Menunggu approval dari browser lama

## 📋 Skenario Login

### 1. Browser Baru Mencoba Login:
```
Browser Baru → Masukkan Password → "Waiting for approval..."
                                    ↓
                            (Mengirim request ke browser lama)
```

### 2. Browser Lama Menerima Notifikasi:
```
Browser Lama → Muncul Dialog:
              ┌─────────────────────────────────┐
              │ ⚠️ New Login Attempt           │
              │                                 │
              │ Someone is trying to login:    │
              │ Browser: Chrome                 │
              │ Email: admin@slideshow.local   │
              │ Time: 10:30:45                  │
              │                                 │
              │ Do you want to allow this?     │
              │                                 │
              │ [Yes, Allow Login] [No, Deny]  │
              └─────────────────────────────────┘
```

### 3. Keputusan:

#### Jika "Yes, Allow Login":
- **Browser Lama** → Logout otomatis
- **Browser Baru** → Login berhasil, masuk ke dashboard

#### Jika "No, Deny":
- **Browser Lama** → Tetap login
- **Browser Baru** → Login ditolak, muncul error

## ⚙️ Setup di Supabase

### 1. Buat Table `login_attempts`
Run di SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  browser_id TEXT NOT NULL,
  browser_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_status ON login_attempts(status);
CREATE INDEX IF NOT EXISTS idx_login_attempts_expires_at ON login_attempts(expires_at);
```

### 2. Monitor Login Attempts
```sql
-- Lihat pending attempts
SELECT * FROM login_attempts 
WHERE status = 'pending' 
AND expires_at > NOW();

-- Clear expired attempts
UPDATE login_attempts 
SET status = 'expired'
WHERE status = 'pending' 
AND expires_at < NOW();
```

## 🕐 Timing

- **Approval Timeout**: 2 menit (login attempt akan expired)
- **Check Interval**: 
  - Browser Baru: Cek status setiap 2 detik
  - Browser Lama: Cek pending attempts setiap 5 detik
- **Session Check**: Setiap 15 detik untuk deteksi logout

## 📱 User Experience

### Browser Lama (Aktif):
1. Sedang kerja normal
2. Tiba-tiba muncul dialog "Someone is trying to login"
3. Pilih:
   - **Allow** → Logout, biarkan browser baru masuk
   - **Deny** → Tetap kerja, tolak login baru

### Browser Baru (Mencoba Login):
1. Masukkan password
2. Klik "Sign in"
3. Muncul "Waiting for approval..."
4. Hasil:
   - **Approved** → Otomatis masuk
   - **Denied** → Error "Login denied by active session"
   - **Timeout** → Error "Login attempt expired"

## 🚨 Troubleshooting

### Problem: Dialog tidak muncul di browser lama
**Solution**: 
1. Pastikan table `login_attempts` sudah dibuat
2. Check browser console untuk error
3. Verify API `/api/auth/check-attempts` berjalan

### Problem: Browser baru stuck di "Waiting..."
**Solution**: 
1. Check apakah sudah timeout (2 menit)
2. Klik Cancel dan coba lagi
3. Pastikan browser lama masih aktif

### Problem: Auto logout tidak bekerja setelah approve
**Solution**:
1. Check session di Supabase
2. Clear browser cache & sessionStorage
3. Login ulang

## 🎯 Keuntungan Sistem Ini

1. **Kontrol Penuh** - User yang sedang aktif punya kontrol
2. **Transparan** - Tahu siapa yang mencoba login
3. **Aman** - Tidak ada auto-takeover tanpa persetujuan
4. **User Friendly** - Dialog yang jelas dengan pilihan

## 📊 Testing Checklist

- [ ] Login di Browser A
- [ ] Coba login di Browser B → Harus waiting
- [ ] Browser A muncul dialog
- [ ] Test "Allow" → Browser A logout, Browser B masuk
- [ ] Test ulang dengan "Deny" → Browser A tetap, Browser B error
- [ ] Test timeout → Tunggu 2 menit tanpa action

# Session Control Guide

## 🔐 Cara Kerja Session Control Sekarang

### ✅ Yang DIIZINKAN:
1. **1 Browser, Multiple Pages** 
   - Admin dan Remote bisa dibuka bersamaan di browser yang sama
   - Contoh: Chrome Tab 1 (Admin) + Chrome Tab 2 (Remote) = OK ✓

2. **Perpindahan Antar Halaman**
   - Dari Admin → Remote = OK ✓
   - Dari Remote → Admin = OK ✓

### ❌ Yang TIDAK DIIZINKAN:
1. **Multiple Browsers**
   - Browser 1 (Chrome) login + Browser 2 (Firefox) login = Conflict ✗
   - Device 1 login + Device 2 login = Conflict ✗

## 🔄 Skenario Session Conflict

### Ketika Ada Login dari Browser Berbeda:

1. **Browser Lama (Aktif)**
   - Akan ter-logout otomatis dalam 15 detik
   - Muncul notifikasi: "Another browser has logged in. You have been logged out."

2. **Browser Baru (Login)**
   - Muncul dialog konfirmasi:
     ```
     Another browser is currently logged in. 
     Do you want to take over the session?
     
     [Yes, take over] [Cancel]
     ```
   - **Yes, take over** → Browser lama logout, browser baru masuk
   - **Cancel** → Tetap di browser lama, browser baru tidak masuk

## 🛠️ Setup di Supabase

### 1. Run Migration Script
Di Supabase SQL Editor, jalankan:
```sql
-- Add browser_id column
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS browser_id TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_active_sessions_browser_id 
ON active_sessions(browser_id);
```

### 2. Monitor Sessions
```sql
-- Lihat session aktif dengan browser ID
SELECT 
  email,
  page,
  LEFT(browser_id, 20) as browser,
  TO_CHAR(last_seen, 'HH24:MI:SS') as last_activity
FROM active_sessions
ORDER BY last_seen DESC;
```

## 🔍 Browser Fingerprinting

Browser diidentifikasi berdasarkan kombinasi:
- User Agent
- Screen Resolution
- Color Depth
- Timezone
- Language

Browser ID disimpan di `localStorage` untuk konsistensi.

## 📊 Testing Scenarios

### Test 1: Same Browser, Multiple Pages
1. Login ke Admin di Chrome
2. Buka tab baru, masuk ke Remote
3. **Expected**: Keduanya bisa diakses ✓

### Test 2: Different Browsers
1. Login ke Admin di Chrome
2. Coba login di Firefox
3. **Expected**: Dialog konfirmasi muncul di Firefox
4. Pilih "Take over" → Chrome logout, Firefox masuk

### Test 3: Different Devices
1. Login di Laptop
2. Coba login di HP
3. **Expected**: Dialog konfirmasi di HP
4. Pilih "Cancel" → Tetap di Laptop

## 🚨 Troubleshooting

### Problem: "Session Already Active" saat pindah halaman
**Solution**: Clear browser cache dan localStorage, login ulang

### Problem: Tidak ada dialog konfirmasi
**Solution**: 
1. Cek browser_id column di Supabase
2. Clear sessionStorage dan login ulang

### Problem: Session tidak ter-logout otomatis
**Solution**: 
1. Cek session check interval (harusnya 15 detik)
2. Verify API `/api/session/check` response

## 📝 Environment Variables

Pastikan semua sudah diset di Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` (optional)

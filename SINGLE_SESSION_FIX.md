# Fix: Single Concurrent Session Enforcement

## Masalah
Admin dan remote page masih bisa login di 2 device atau 2 browser secara bersamaan. Sistem hanya memblokir jika ada user yang BERBEDA, tapi tidak memblokir jika user yang SAMA membuka multiple tabs/browsers.

## Akar Masalah
Session check sebelumnya hanya memeriksa `user_id`:
```typescript
if (activeSession && activeSession.user_id !== auth.userId) {
  // Different user is logged in
  return res.status(403).json({...});
}
```

Karena admin dan remote menggunakan user yang SAMA (admin@slideshow.local), mereka memiliki `user_id` yang sama, jadi check ini selalu pass. Kedua page bisa saling overwrite session satu sama lain tanpa terdeteksi.

## Solusi
Menambahkan **session_id** unik untuk setiap browser/tab:
1. Generate unique session ID saat login
2. Simpan session ID di sessionStorage
3. Kirim session ID setiap kali check session
4. Bandingkan session ID di database - hanya izinkan 1 session aktif

## Perubahan Kode

### 1. Database Schema (`supabase/011_add_session_id_column.sql`)
Menambahkan kolom `session_id` ke tabel `active_sessions`:
```sql
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id 
ON active_sessions(session_id);

-- Update existing rows
UPDATE active_sessions 
SET session_id = CONCAT('legacy-', id::TEXT)
WHERE session_id IS NULL;

-- Make NOT NULL
ALTER TABLE active_sessions 
ALTER COLUMN session_id SET NOT NULL;
```

### 2. Session Manager (`lib/session-manager.ts`)
- Tambah `session_id` ke interface `ActiveSession`
- Update `createOrUpdateSession()` untuk menerima dan menyimpan `sessionId`
- Jika session dengan `sessionId` yang sama sudah ada, hanya update `last_seen`
- Jika `sessionId` berbeda, clear ALL sessions dan buat yang baru

### 3. Auth API (`pages/api/auth.ts`)
- Generate unique session ID saat login
- Return `sessionId` bersama token lainnya
```typescript
const sessionId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
```

### 4. Login Page (`pages/login.tsx`)
- Store `sessionId` di sessionStorage saat login berhasil
```typescript
sessionStorage.setItem("session-id", sessionId);
```

### 5. Session Check API (`pages/api/session/check.ts`)
- Terima `sessionId` dari request body
- Bandingkan dengan active session di database
- Reject jika ada session aktif dengan `sessionId` berbeda
- Pesan error yang lebih spesifik:
  - Different user
  - Different page (admin vs remote)
  - Different device/browser

### 6. Admin Page (`pages/admin.tsx`)
- Generate/get session ID dari sessionStorage
- Kirim `sessionId` saat check session
- Clear session ID saat logout
```typescript
let sessionId = sessionStorage.getItem("session-id");
if (!sessionId) {
  sessionId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem("session-id", sessionId);
}
```

### 7. Remote Page (`pages/remote.tsx`)
- Generate/get session ID dari sessionStorage
- Kirim `sessionId` saat check session dan periodic check
- Clear session ID saat logout atau error

## Cara Install/Update

### 1. Jalankan Database Migration
Buka **Supabase Dashboard** → **SQL Editor**, lalu copy-paste dan jalankan:

```sql
-- Add session_id column
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id 
ON active_sessions(session_id);

UPDATE active_sessions 
SET session_id = CONCAT('legacy-', id::TEXT)
WHERE session_id IS NULL;

ALTER TABLE active_sessions 
ALTER COLUMN session_id SET NOT NULL;
```

### 2. Clear Existing Sessions (Opsional)
Untuk memastikan clean start:
```sql
DELETE FROM active_sessions;
```

### 3. Restart Development Server
```bash
npm run dev
```

## Testing

### Test 1: Single Device Enforcement
1. Login di Browser A (Chrome) → buka `/admin`
2. ✅ Admin page terbuka normal
3. Login di Browser B (Firefox) → buka `/admin`
4. ✅ Browser A logout otomatis dengan pesan: "You are already logged in on admin page in another browser/device"
5. ✅ Browser B berhasil login

### Test 2: Admin vs Remote Enforcement
1. Login di Browser A → buka `/admin`
2. ✅ Admin page terbuka normal
3. Di Browser A, buka tab baru → buka `/remote`
4. ❌ Remote page DITOLAK dengan pesan: "You are already logged in on admin page in another browser/tab"
5. ✅ Admin tab tetap aktif

### Test 3: Remote vs Admin Enforcement
1. Login di Browser A → buka `/remote`
2. ✅ Remote page terbuka normal
3. Di Browser B → buka `/admin`
4. ✅ Browser A (remote) logout otomatis dengan pesan: "You are already logged in on admin page in another browser/device"
5. ✅ Browser B (admin) berhasil login

### Test 4: Logout Clears Session
1. Login di Browser A → buka `/admin`
2. Klik Logout
3. ✅ Session cleared dari database
4. Buka `/admin` atau `/remote` di browser lain
5. ✅ Berhasil login tanpa error

### Test 5: Session Persistence
1. Login di Browser A → buka `/admin`
2. Refresh page (F5)
3. ✅ Tetap login (session ID tersimpan di sessionStorage)
4. Tutup tab dan buka lagi `/admin`
5. ✅ Redirect ke login (sessionStorage cleared)

## Session Management Flow

### Login Flow
```
1. User masukkan password di /login
2. /api/auth verify password
3. Generate unique sessionId
4. Create Supabase session
5. Create session record di DB dengan sessionId
6. Return token + sessionId
7. Store di sessionStorage
```

### Session Check Flow (Every 15s)
```
1. Get sessionId dari sessionStorage
2. Call /api/session/check dengan { page, sessionId }
3. Verify auth token
4. Get active session dari DB
5. Compare:
   - user_id match? 
   - page match?
   - session_id match?
6. If ALL match → update last_seen
7. If ANY different → reject with error
8. Client receives rejection → logout + show error
```

### Logout Flow
```
1. Call /api/logout (cookie)
2. Call /api/session/logout (session manager)
3. Clear session dari DB
4. Clear sessionStorage (token + session-id)
5. Redirect to /login
```

## Keamanan

### Proteksi
✅ Hanya 1 concurrent session per user
✅ Session ID unik per browser/tab
✅ Periodic check (15s) untuk deteksi concurrent login
✅ Auto-logout jika session baru terdeteksi
✅ Session timeout (24 jam)
✅ Cleanup stale sessions

### Session ID Format
- Login: `${user.id}-${timestamp}-${random}`
- Admin fallback: `admin-${timestamp}-${random}`
- Remote fallback: `remote-${timestamp}-${random}`
- Legacy migration: `legacy-${uuid}`

## Error Messages

### Different User
```
"Another user (admin@slideshow.local) is currently logged in on admin page."
```

### Different Page (Same User)
```
"You are already logged in on admin page in another browser/tab."
```

### Different Device (Same User, Same Page)
```
"You are already logged in on admin page in another browser/device."
```

## Troubleshooting

### Stuck "Session Already Active"
```sql
-- Clear all sessions
DELETE FROM active_sessions;
```

### Session Check Fails
1. Check console logs untuk error details
2. Verify sessionId exists di sessionStorage
3. Verify active_sessions table memiliki kolom session_id
4. Check Supabase auth token masih valid

### Migration Error
Jika kolom sudah exists:
```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'active_sessions';

-- If session_id exists, skip migration
```

## Notes

- Session ID stored di **sessionStorage** (NOT localStorage)
  - Beda tab = beda sessionStorage = beda session ID
  - Tutup tab = sessionStorage cleared
- Periodic check setiap 15 detik (configurable)
- Heartbeat setiap 60 detik untuk keep session alive
- Database cleanup stale sessions > 24 jam

## File Changes Summary

✅ `supabase/011_add_session_id_column.sql` - Database migration
✅ `lib/session-manager.ts` - Session ID support
✅ `pages/api/auth.ts` - Generate session ID on login
✅ `pages/api/session/check.ts` - Validate session ID
✅ `pages/login.tsx` - Store session ID
✅ `pages/admin.tsx` - Use session ID + clear on logout
✅ `pages/remote.tsx` - Use session ID + clear on logout/error

## Verification

Setelah update, check:
1. Database has `session_id` column: ✅
2. Login creates session with unique ID: ✅
3. Second login clears first session: ✅
4. Session check validates session ID: ✅
5. Logout clears session ID: ✅

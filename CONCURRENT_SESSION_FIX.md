# Concurrent Session Fix

## Problem
1. Remote page tidak bisa diakses setelah login via admin
2. Bisa login di 2 tempat sekaligus (tidak ada concurrent session control)

## Root Cause
- Admin menggunakan **cookie-based auth** 
- Remote menggunakan **Supabase auth + session manager**
- Dua sistem yang tidak terintegrasi

## Solution
Integrasikan admin dengan Supabase auth dan session manager:

### 1. Database Migration Required

Jalankan SQL migration untuk membuat tabel `active_sessions`:

```bash
# Di Supabase Dashboard → SQL Editor
# Copy dan jalankan file: supabase/010_create_sessions_table.sql
```

Atau langsung:

```sql
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT NOT NULL CHECK (page IN ('admin', 'remote'))
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id 
ON active_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen 
ON active_sessions(last_seen);
```

### 2. Environment Variable (Optional)

Tambahkan ke `.env.local` (default: admin@slideshow.local):

```
ADMIN_EMAIL=admin@slideshow.local
```

### 3. How It Works

**Login Flow:**
1. User enters password di `/login`
2. `/api/auth` verifies password
3. Creates/signs in Supabase user with same password
4. Checks for concurrent session → clears if found (admin priority)
5. Creates new session in `active_sessions` table
6. Returns both cookie token (backward compat) + Supabase token
7. Stores both tokens in sessionStorage

**Admin Page:**
1. Checks Supabase token from sessionStorage
2. Calls `/api/session/check` with page="admin"
3. If concurrent session detected → logs out + redirects to login
4. Stores session in `active_sessions` table

**Remote Page:**
1. Checks Supabase token from sessionStorage (shared from login)
2. Calls `/api/session/check` with page="remote"
3. If concurrent session detected → shows error
4. Can access remote controls if authenticated

**Logout:**
1. Calls `/api/logout` (cookie-based)
2. Calls `/api/session/logout` (session manager)
3. Clears both tokens from sessionStorage
4. Removes session from database

### 4. Testing

1. **Login di admin → akses remote:**
   ```
   1. Login via /login
   2. Navigate to /remote
   3. Should work ✅
   ```

2. **Concurrent session prevention:**
   ```
   1. Login di browser A (Chrome)
   2. Try login di browser B (Firefox)
   3. Browser A should be logged out ✅
   ```

3. **Logout clears session:**
   ```
   1. Login di admin
   2. Logout
   3. Try akses remote → should redirect to login ✅
   ```

### 5. Session Management

- **Single concurrent session**: Only 1 user can be logged in at a time
- **Admin priority**: Admin login will force logout other sessions
- **Heartbeat**: Remote page sends heartbeat every 60s to keep session alive
- **Timeout**: Sessions older than 24 hours are automatically cleaned up

### 6. Files Modified

- `pages/api/auth.ts` - Integrated with Supabase auth + session manager
- `pages/login.tsx` - Stores both cookie + Supabase token
- `pages/admin.tsx` - Session check on mount + proper logout
- `pages/remote.tsx` - Uses Supabase token from sessionStorage
- `supabase/010_create_sessions_table.sql` - Database schema

### 7. Troubleshooting

**Remote page masih tidak bisa diakses:**
```bash
# Check if active_sessions table exists
# Di Supabase Dashboard → Table Editor
# Cari tabel "active_sessions"
```

**Concurrent session tidak bekerja:**
```bash
# Check console logs
# Browser DevTools → Console
# Look for: [Admin] Session check... / [Remote] Session check...
```

**Session tidak terhapus saat logout:**
```bash
# Manual clear:
# Di Supabase Dashboard → SQL Editor
DELETE FROM active_sessions;
```

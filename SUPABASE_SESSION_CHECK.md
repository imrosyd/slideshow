# Supabase Session Control Checklist

## 🔍 Yang Perlu Dicek di Supabase Dashboard

### 1. **Cek Table `active_sessions`**
Buka Supabase Dashboard → Table Editor → `active_sessions`

**Struktur yang harus ada:**
```sql
- id (UUID, Primary Key)
- user_id (UUID, NOT NULL)
- email (TEXT, NOT NULL)
- created_at (TIMESTAMPTZ, NOT NULL)
- last_seen (TIMESTAMPTZ, NOT NULL)
- page (TEXT, NOT NULL) - harus 'admin' atau 'remote'
- session_id (TEXT, NOT NULL) - untuk tracking per browser/device
```

**Index yang harus ada:**
- `idx_active_sessions_user_id` pada kolom `user_id`
- `idx_active_sessions_last_seen` pada kolom `last_seen`
- `idx_active_sessions_session_id` pada kolom `session_id`

### 2. **Run Migration Scripts (Jika Belum)**
Jika table belum ada, run script ini di SQL Editor:

```sql
-- 1. Create table (010_create_sessions_table.sql)
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT NOT NULL CHECK (page IN ('admin', 'remote'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions(last_seen);

-- 2. Add session_id column (011_add_session_id_column.sql)
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);

-- Update existing rows
UPDATE active_sessions 
SET session_id = CONCAT('legacy-', id::TEXT)
WHERE session_id IS NULL;

-- Make NOT NULL
ALTER TABLE active_sessions 
ALTER COLUMN session_id SET NOT NULL;
```

### 3. **Cek RLS (Row Level Security)**
Table `active_sessions` **TIDAK** memerlukan RLS karena:
- Diakses menggunakan Service Role Key
- Hanya untuk internal session management
- Tidak diakses langsung dari client

**Pastikan RLS DISABLED untuk table ini:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_sessions';

-- If needed, disable RLS
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
```

### 4. **Monitor Active Sessions**
Untuk melihat session yang aktif:

```sql
-- Lihat semua active sessions
SELECT * FROM active_sessions 
ORDER BY last_seen DESC;

-- Lihat session dalam 24 jam terakhir
SELECT * FROM active_sessions 
WHERE last_seen > NOW() - INTERVAL '24 hours'
ORDER BY last_seen DESC;

-- Clear all sessions (force logout semua)
DELETE FROM active_sessions;
```

### 5. **Cleanup Stale Sessions**
Untuk membersihkan session lama (optional):

```sql
-- Delete sessions older than 24 hours
DELETE FROM active_sessions 
WHERE last_seen < NOW() - INTERVAL '24 hours';

-- Atau buat scheduled job di Supabase:
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM active_sessions 
  WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Run setiap hari jam 3 pagi
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '0 3 * * *',
  'SELECT cleanup_stale_sessions()'
);
```

### 6. **Testing Single Session Control**

**Test Scenario:**
1. Login di Browser A → Check table, harus ada 1 row
2. Login di Browser B → Check table, harus tetap 1 row (row lama terhapus)
3. Kembali ke Browser A → Harus ter-logout otomatis

**Query untuk monitoring:**
```sql
-- Real-time monitoring
SELECT 
  email,
  page,
  created_at,
  last_seen,
  AGE(NOW(), last_seen) as idle_time,
  LEFT(session_id, 20) as session_preview
FROM active_sessions
ORDER BY last_seen DESC;
```

### 7. **Environment Variables di Vercel**
Pastikan semua environment variables sudah diset:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (untuk akses table sessions)
- ✅ `ADMIN_PASSWORD`
- ✅ `ADMIN_EMAIL` (optional, default: admin@slideshow.local)

### 8. **Debug Query**
Jika ada masalah, gunakan query ini untuk debug:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'active_sessions'
);

-- Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'active_sessions'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'active_sessions';

-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'active_sessions'::regclass;
```

## ✅ Checklist Sebelum Deploy

- [ ] Table `active_sessions` sudah ada
- [ ] Kolom `session_id` sudah ada dan NOT NULL
- [ ] Semua index sudah dibuat
- [ ] RLS disabled untuk table ini
- [ ] Test single session control berhasil
- [ ] Environment variables lengkap di Vercel
- [ ] Build lokal berhasil tanpa error

## 🚨 Troubleshooting

### Problem: "Table active_sessions not found"
**Solution:** Run migration scripts di atas

### Problem: "Multiple sessions still allowed"
**Solution:** 
1. Check apakah `forceNew: true` di auth.ts
2. Pastikan `clearAllSessions` dipanggil saat login
3. Verify session check interval (15 detik)

### Problem: "Session check failed"
**Solution:**
1. Check SUPABASE_SERVICE_ROLE_KEY di env
2. Verify table permissions
3. Check Supabase logs untuk error details

## 📊 Monitoring Dashboard Query

Buat view untuk monitoring mudah:

```sql
CREATE OR REPLACE VIEW session_monitoring AS
SELECT 
  email,
  page,
  created_at::date as login_date,
  TO_CHAR(created_at, 'HH24:MI:SS') as login_time,
  TO_CHAR(last_seen, 'HH24:MI:SS') as last_activity,
  EXTRACT(EPOCH FROM (NOW() - last_seen))/60 as idle_minutes,
  LEFT(session_id, 15) || '...' as session_id_short
FROM active_sessions
ORDER BY last_seen DESC;

-- Usage:
SELECT * FROM session_monitoring;
```

# Supabase Configuration Checklist

## 🔍 Yang Harus Dicek di Supabase

### 1. Storage Bucket Configuration

#### Cek di Supabase Dashboard:
```
1. Login ke https://supabase.com/dashboard
2. Pilih project Anda
3. Klik "Storage" di sidebar
4. Pastikan bucket "slideshow-images" ada
5. Klik bucket → Settings
```

#### Pastikan Setting Berikut:
- ✅ **Public bucket**: YES (harus public)
- ✅ **File size limit**: Minimal 10MB (untuk video)
- ✅ **Allowed MIME types**: 
  - image/*
  - video/mp4
  - video/webm

#### Test Upload:
```sql
-- Di SQL Editor, test apakah bisa upload:
SELECT storage.buckets.public FROM storage.buckets WHERE name = 'slideshow-images';
-- Harus return: true
```

### 2. Database Tables

#### Cek Table image_durations:
```sql
-- Di SQL Editor:
SELECT * FROM image_durations LIMIT 5;

-- Pastikan kolom ini ada:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'image_durations';
```

#### Kolom yang Harus Ada:
- ✅ id
- ✅ filename (VARCHAR 255)
- ✅ duration_ms (INTEGER)
- ✅ caption (TEXT)
- ✅ order_index (INTEGER)
- ✅ hidden (BOOLEAN)
- ✅ video_url (TEXT) ← PENTING!
- ✅ video_generated_at (TIMESTAMP)
- ✅ video_duration_seconds (NUMERIC)
- ✅ created_at
- ✅ updated_at

### 3. RLS (Row Level Security) Policies

#### Cek Policies untuk Storage:
```
1. Storage → Policies
2. Pastikan ada policy untuk:
   - SELECT (read): Allow public
   - INSERT (upload): Allow authenticated/public
   - UPDATE: Allow authenticated
   - DELETE: Allow authenticated
```

#### Disable RLS untuk Development (Optional):
```sql
-- Jika masih testing, bisa disable RLS sementara:
ALTER TABLE image_durations DISABLE ROW LEVEL SECURITY;
```

### 4. Service Role Key

#### Verifikasi di Vercel:
```
1. Vercel Dashboard → Project Settings
2. Environment Variables
3. Pastikan ada:
   - SUPABASE_SERVICE_ROLE_KEY
   - Bukan ANON_KEY!
```

#### Cara Ambil Service Role Key:
```
1. Supabase Dashboard
2. Settings → API
3. Scroll ke "Project API keys"
4. Copy "service_role" key (bukan anon!)
5. ⚠️ JANGAN share key ini!
```

### 5. Storage Permissions

#### Test Upload Permission:
```javascript
// Di browser console:
const { data, error } = await supabase
  .storage
  .from('slideshow-images')
  .upload('test.txt', new Blob(['test']));
  
console.log('Upload result:', { data, error });
```

#### Test Read Permission:
```javascript
// Di browser console:
const { data: publicData } = supabase
  .storage
  .from('slideshow-images')
  .getPublicUrl('test.txt');
  
console.log('Public URL:', publicData.publicUrl);
```

### 6. CORS Configuration

#### Pastikan CORS Sudah Benar:
```
1. Supabase Dashboard → Settings → API
2. Scroll ke "CORS"
3. Pastikan domain Vercel Anda ada di whitelist
```

#### Domain yang Harus Diwhitelist:
- `http://localhost:3000` (development)
- `https://your-app.vercel.app` (production)
- `https://*.vercel.app` (preview deployments)

## ✅ Quick Test Checklist

Centang setiap item setelah dicek:

### Storage:
- [ ] Bucket `slideshow-images` exists
- [ ] Bucket is PUBLIC
- [ ] Can upload images (test manual upload)
- [ ] Can view images via public URL
- [ ] File size limit >= 10MB

### Database:
- [ ] Table `image_durations` exists
- [ ] Column `video_url` exists (type: TEXT)
- [ ] RLS policies configured or disabled
- [ ] Can INSERT/UPDATE/SELECT data

### Environment Variables (Vercel):
- [ ] NEXT_PUBLIC_SUPABASE_URL set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] SUPABASE_SERVICE_ROLE_KEY set ← PENTING!

### API Access:
- [ ] Can fetch images from storage
- [ ] Can update database records
- [ ] CORS allows Vercel domain

## 🐛 Common Issues

### Issue 1: "Failed to upload video"
**Cause**: Storage bucket not public or wrong permissions
**Fix**: 
```sql
-- Make bucket public:
UPDATE storage.buckets 
SET public = true 
WHERE name = 'slideshow-images';
```

### Issue 2: "Row not found"
**Cause**: RLS blocking access
**Fix**:
```sql
-- Disable RLS temporarily:
ALTER TABLE image_durations DISABLE ROW LEVEL SECURITY;
```

### Issue 3: "CORS error"
**Cause**: Domain not whitelisted
**Fix**: Add your Vercel URL to CORS settings

### Issue 4: "Service role key invalid"
**Cause**: Using ANON key instead of SERVICE_ROLE key
**Fix**: Get correct key from Supabase Dashboard → Settings → API

## 📝 Logs to Check

### Vercel Logs:
Look for these errors:
- `Error: storage/not-found`
- `Error: storage/unauthorized`
- `Error: Invalid API key`
- `FFmpeg error`
- `Timeout`

### Supabase Logs:
```
1. Supabase Dashboard → Logs
2. Filter by: Storage / Database
3. Look for 40x errors
```

## 💡 Next Steps After Checking

1. ✅ Centang semua item di checklist
2. 📸 Screenshot error dari Vercel logs
3. 📋 Share hasil pengecekan
4. 🔧 Kita debug bareng berdasarkan temuan

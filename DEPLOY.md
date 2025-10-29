# Deploy ke Vercel - Panduan Lengkap

## ✅ Persiapan Sebelum Deploy

### 1. File yang Sudah Disiapkan:
- ✅ `vercel.json` - Konfigurasi Vercel
- ✅ `.eslintrc.json` - ESLint rules (warnings disabled)
- ✅ `.env.example` - Template environment variables
- ✅ `.gitignore` - File yang tidak di-commit

### 2. Build Test Lokal:
```bash
npm run build
# Harus berhasil tanpa error!
```

---

## 🚀 Langkah Deploy ke Vercel

### Step 1: Push ke GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Connect ke Vercel

1. **Login ke Vercel:** https://vercel.com
2. **Import Project:**
   - Klik "Add New" → "Project"
   - Pilih repository: `imrosyd/slideshow`
   - Klik "Import"

3. **Configure Project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

### Step 3: Set Environment Variables

Di Vercel Dashboard → Settings → Environment Variables, tambahkan:

```
ADMIN_PASSWORD=general2025

NEXT_PUBLIC_SUPABASE_URL=https://rcffsmrdqtciwgluxxow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZmZzbXJkcXRjaXdnbHV4eG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzAwNjAsImV4cCI6MjA3NzI0NjA2MH0.juj-sIjnOtuKzkEK-4FnG5plU9xewbRQQMQswHc16j8

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZmZzbXJkcXRjaXdnbHV4eG93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3MDA2MCwiZXhwIjoyMDc3MjQ2MDYwfQ.Xb8-iquAwHzRGYuqLcIJhQRP35QAasf8oQwKQV4J8j0

SUPABASE_STORAGE_BUCKET=slideshow-images

SUPABASE_DURATIONS_TABLE=image_durations
```

**Penting:** Pilih environment: **Production, Preview, dan Development**

### Step 4: Deploy!

Klik **"Deploy"** dan tunggu proses selesai (±2-3 menit).

---

## 🔍 Troubleshooting Deployment

### Error: "Module not found"
**Solusi:** Pastikan semua dependencies ada di `package.json`
```bash
npm install
npm run build
```

### Error: "Build failed - TypeScript errors"
**Solusi:** File `index-old.tsx` sudah dihapus. Jika masih error:
```bash
rm -f pages/index-old.tsx pages/index-new.tsx
git add . && git commit -m "Remove old files" && git push
```

### Error: "Environment variables not set"
**Solusi:** 
1. Cek di Vercel Dashboard → Settings → Environment Variables
2. Pastikan semua 5 variables sudah diisi
3. Redeploy: Deployments → ... → Redeploy

### Error: "Supabase connection failed"
**Solusi:**
1. Cek Supabase keys masih valid
2. Cek bucket `slideshow-images` sudah dibuat
3. Cek tabel `image_durations` sudah dibuat

### Error: "Function timeout"
**Solusi:** Sudah diatur di `vercel.json`:
```json
{
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

---

## 📝 Setelah Deploy

### URL Aplikasi:
- Production: `https://slideshow-xyz.vercel.app`
- Admin: `https://slideshow-xyz.vercel.app/admin`

### Custom Domain (Opsional):
1. Di Vercel Dashboard → Settings → Domains
2. Add domain: `slideshow.yourdomain.com`
3. Update DNS records sesuai instruksi Vercel

---

## 🔒 Security Checklist

- ✅ `.env.local` tidak di-commit (ada di `.gitignore`)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` hanya di environment variables
- ✅ `ADMIN_PASSWORD` tidak hardcoded di code
- ✅ API routes dilindungi dengan authentication

---

## 🎯 Performance Tips

1. **CDN**: Vercel otomatis menggunakan Edge Network
2. **Caching**: Sudah diatur di API routes
3. **Image Optimization**: Disabled (untuk kualitas maksimal)
4. **Serverless Functions**: Auto-scaling

---

## 🔄 Update Aplikasi

Setiap push ke GitHub akan otomatis trigger deployment:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel otomatis deploy!
```

---

## 📊 Monitoring

Di Vercel Dashboard bisa monitor:
- **Analytics**: Traffic, performance
- **Logs**: Function logs, errors
- **Deployments**: History, rollback

---

## 💡 Tips

1. **Preview Deployment**: Setiap PR otomatis dapat preview URL
2. **Rollback**: Bisa rollback ke deployment sebelumnya dengan 1 klik
3. **Branch Deploy**: Branch lain juga bisa di-deploy untuk testing

---

**Aplikasi siap di-deploy ke Vercel!** 🚀

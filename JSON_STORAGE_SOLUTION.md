# Solusi Penyimpanan Metadata - JSON File Storage

## Ringkasan Perubahan

Aplikasi slideshow sekarang menggunakan **file JSON** untuk menyimpan metadata timer dan caption, **TIDAK memerlukan database Supabase** lagi.

## Cara Kerja

### Lokasi Penyimpanan
- File metadata disimpan di: `metadata.json` dalam bucket Supabase Storage (folder yang sama dengan gambar)
- Format: JSON file dengan struktur sederhana

### Struktur Data
```json
{
  "images": {
    "dashboard1.png": {
      "filename": "dashboard1.png",
      "duration_ms": 8000,
      "caption": "Sales Dashboard"
    },
    "dashboard2.png": {
      "filename": "dashboard2.png",
      "duration_ms": 12000
    }
  },
  "updated_at": "2025-11-04T10:30:00.000Z"
}
```

## Keuntungan Solusi Ini

✅ **Tidak Perlu Database Table** - Tidak perlu setup SQL atau RLS  
✅ **Deployment Mudah** - Bekerja langsung setelah deploy  
✅ **Persistence Otomatis** - File disimpan di Supabase Storage yang reliable  
✅ **Backup Mudah** - Cukup download 1 file JSON  
✅ **Debugging Mudah** - Bisa lihat isi file langsung dari Supabase Dashboard  

## File yang Diubah

1. `/pages/api/admin/metadata.ts` - Menyimpan metadata ke `metadata.json`
2. `/pages/api/admin/images.ts` - Membaca metadata dari `metadata.json`
3. `/pages/api/images.ts` - Slideshow membaca metadata dari `metadata.json`

## Cara Menggunakan

### Di Admin Panel
1. Login ke `/admin`
2. Upload gambar
3. Ubah timer duration untuk setiap gambar
4. Klik **Save All Changes**
5. Timer akan tersimpan dan tetap ada setelah reload

### Verifikasi

Untuk memastikan metadata tersimpan:
1. Buka Supabase Dashboard
2. Pergi ke **Storage** → bucket **slideshow**
3. Cari file `metadata.json`
4. Klik untuk melihat isinya

## Troubleshooting

### Timer tidak tersimpan?
- Cek Vercel logs: lihat error dari `[Metadata]`  
- Pastikan bucket Storage memiliki permission write untuk service role
- Cek apakah file `metadata.json` muncul di Storage bucket

### Timer hilang setelah reload?
- Pastikan request save berhasil (HTTP 200)
- Cek apakah file `metadata.json` ada di Storage
- Clear browser cache dan refresh

## Migrasi dari Solusi Lama

Jika sebelumnya sudah ada data di database table `image_durations`, data akan hilang dengan solusi baru ini. Namun karena database table belum pernah berhasil dibuat, tidak ada data yang perlu dimigrasi.

Mulai dari sekarang, semua metadata akan tersimpan di `metadata.json` secara otomatis.

## Environment Variables

Hanya memerlukan variabel yang sudah ada:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: "slideshow")
- `ADMIN_PASSWORD`

**TIDAK memerlukan** `SUPABASE_DURATIONS_TABLE` lagi.

## Kesimpulan

Solusi baru ini lebih sederhana, lebih reliable, dan tidak memerlukan setup database. Perfect untuk use case slideshow dengan metadata yang relatif kecil.

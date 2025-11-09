# Testing Video di Slideshow

## Cara Memeriksa Status Video

### 1. Check Database
Buka: http://localhost:3000/api/check-videos
Endpoint ini akan menampilkan:
- Total item di database
- Item-video yang ada (dengan is_video = true)
- URL video yang tersimpan
- Status apakah video akan tampil di slideshow

### 2. Test Video Player
Buka: http://localhost:3000/debug-video.html
Akan menampilkan:
- Data dari API /api/images
- Test player untuk video pertama yang ditemukan
- Console log untuk debugging

### 3. Check Main Page
Buka: http://localhost:3000
Periksa console browser untuk logs:
- `📹 First video:` - menampilkan info video pertama
- `🔵 Loading:` - saat video mulai dimuat
- `▶️ Playing:` - saat video berhasil diputar
- `❌ Video error:` - jika ada error

## Troubleshooting

### Video tidak muncul?

1. **Check API Response**
   - Apakah `/api/images` mengembalikan data dengan `isVideo: true`?
   - Apakah `videoUrl` terisi?

2. **Check Database**
   - Apakah field `is_video` = true untuk item video?
   - Apakah field `video_url` tersimpan nilainya?

3. **Check Console**
   - Apakah ada error saat memuat video?
   - Apakah video URL accessible?

### Generate Video Baru

1. Login ke admin: http://localhost:3000/login
2. Upload image atau PDF
3. Generate video dengan tombol "Generate Video"
4. Tunggu proses selesai
5. Refresh main page

## Perbaikan yang Dilakukan

1. **Fixed API Logic** - Sekarang menampilkan semua items yang tidak hidden atau video (meskipun hidden)
2. **Video Map Logic** - Memastikan video data tersimpan dan diakses dengan benar
3. **TypeScript Types** - Database types diperbarui dengan field video
4. **Debug Tools** - Endpoint dan page untuk testing video

# FFmpeg di Vercel - Solusi

## Masalah
Vercel Serverless Functions tidak memiliki FFmpeg terinstall by default, sehingga video generation akan gagal.

## Solusi 1: Gunakan FFmpeg Layer (Recommended untuk Vercel)

### Install @ffmpeg-installer/ffmpeg
```bash
npm install @ffmpeg-installer/ffmpeg
```

### Update generate-video.ts
Ubah cara memanggil ffmpeg untuk menggunakan package:

```typescript
import ffmpeg from '@ffmpeg-installer/ffmpeg';

// Ganti 'ffmpeg' dengan ffmpeg.path
const ffmpegPath = ffmpeg.path;
ffmpegCmd = `${ffmpegPath} ...`;
```

## Solusi 2: Gunakan External Service (Lebih Reliable)

### Opsi A: Cloudinary
- Upload image ke Cloudinary
- Transform ke video dengan API mereka
- Free tier: 25 credits/month

### Opsi B: AWS Lambda dengan FFmpeg Layer
- Deploy function terpisah di AWS Lambda
- Panggil dari Next.js API

### Opsi C: Generate di Client-Side dengan ffmpeg.wasm
- Generate video di browser user
- Upload hasil video ke Supabase

## Solusi 3: Disable Auto-Generate, Upload Manual
- Hapus auto-generate feature
- User upload video manual yang sudah jadi

## Recommended: Solusi 1
Paling mudah dan tetap dalam ecosystem Vercel.

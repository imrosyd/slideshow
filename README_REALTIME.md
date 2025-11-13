# Realtime Updates - Dua Pilihan

Aplikasi ini mendukung **2 mode realtime** untuk remote control dan live updates:

## 1. **Supabase Realtime** (Cloud)
Jika Anda mengkonfigurasi Supabase, aplikasi akan menggunakan Supabase Realtime:
- ✅ Broadcast channels
- ✅ WebSocket managed by Supabase
- ✅ Cocok untuk deployment di Vercel/serverless

**Setup:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
```

## 2. **Socket.io** (Self-hosted)
Jika Supabase TIDAK dikonfigurasi, aplikasi akan **otomatis** menggunakan Socket.io:
- ✅ WebSocket server built-in
- ✅ No external dependency
- ✅ Perfect untuk localhost / VPS

**Setup:**
Tidak perlu setup! Socket.io akan otomatis aktif jika Supabase tidak dikonfigurasi.

## Cara Menggunakan (Localhost/VPS)

### Development:
```bash
npm run dev
# Server akan jalan di http://localhost:3000
# Socket.io otomatis aktif di ws://localhost:3000/socket.io/
```

### Production:
```bash
npm run build
npm start
# Socket.io akan berjalan di production mode
```

## Fitur Realtime yang Didukung

Baik Supabase maupun Socket.io mendukung:
- 🎮 Remote Control (play/pause/next/previous)
- 📊 Live status updates
- 🖼️ Image metadata sync
- 🎬 Video generation updates
- 🔄 Force refresh
- 📱 Multi-device sync

## Auto-Detection

Aplikasi akan **otomatis mendeteksi** mode realtime:
```
Jika NEXT_PUBLIC_SUPABASE_URL ada → Gunakan Supabase Realtime
Jika TIDAK ada → Gunakan Socket.io
```

## Port Configuration

Untuk VPS, Anda bisa set custom port:
```bash
PORT=8080 npm start
```

Socket.io akan mengikuti port yang sama dengan Next.js server.

## Troubleshooting

### Socket.io tidak connect?
1. Pastikan server.js digunakan (check npm start menggunakan `node server.js`)
2. Check console browser untuk error
3. Pastikan firewall tidak block WebSocket

### Realtime tidak berfungsi?
1. Check browser console untuk connection logs
2. Verify `[Socket.io] Connected to server` atau `[Supabase] Channel subscribed`
3. Test dengan membuka `/remote` di device lain

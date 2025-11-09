# 📺 Slideshow Display System

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> All-in-one digital signage dashboard for TV displays with Supabase storage, manual image/PDF → MP4 conversion, and webOS keep-awake optimizations.

🌐 **Language:** 🇺🇸 English · [🇮🇩 Indonesian](README.id.md)

**Last Updated:** November 9, 2025 · **Status:** Production ready

---

## Overview
Slideshow is a Next.js 14 + TypeScript application for managing always-on TV content. Admins upload images or PDFs, fine-tune durations, captions, and order, then trigger one-click FFmpeg conversion to MP4 so displays can play buttery-smooth loops on LG webOS or any modern screen.

## Feature Highlights

### 🎨 Admin Dashboard (`/admin`)
**Upload & Management**
- Drag-and-drop uploads (JPG, PNG, GIF, PDF) directly to Supabase Storage
- PDF-to-images conversion with preview before upload
- Bulk upload support with progress tracking
- Search and filter images by filename
- Real-time upload status with individual task tracking

**Image Organization**
- Drag-and-drop reordering with visual feedback
- Hide/show images from slideshow without deletion
- Rename files with extension preservation
- Delete single or multiple images (bulk delete)
- Individual image metadata editing (caption, duration)

**Video Generation**
- Manual per-image MP4 generation with FFmpeg
- Merge multiple images (min. 1 image) into single dashboard video
- Custom duration per image in merged videos
- Video preview and management
- Delete generated videos while keeping source images
- Progress indicator for video processing

**Bulk Operations**
- Bulk edit dialog for batch metadata updates
- Bulk delete with confirmation
- Apply same duration/caption to multiple images
- Quick visibility toggle for multiple items

**Maintenance Tools**
- Force refresh slideshow display remotely
- Cleanup corrupt videos automatically
- Remove orphaned files from storage
- Database consistency checks
- Quick stats dashboard (total images, storage size, video count)

**UI/UX Features**
- Glassmorphism design with backdrop blur effects
- Responsive layout for desktop and tablet
- Fullscreen image preview on click
- Thumbnail generation for fast loading
- Dark theme with gradient accents
- Toast notifications for all actions

### 📺 Display Player (`/`)
**Playback Features**
- Fullscreen slideshow optimized for TV displays
- Smooth transitions between images/videos
- Auto-advance based on configured durations
- Preload buffer for seamless playback
- Retry logic for failed media loads
- Auto-refresh every 60 seconds for new content

**Display Management**
- Keep display awake (Wake Lock API + webOS Power Manager)
- Prevent TV sleep with synthetic movement
- WebOS-specific optimizations
- Fullscreen mode with keyboard shortcuts
- Video format support (MP4, WebM)

**Gallery Features**
- Auto-hide bottom gallery bar (appears on mouse proximity)
- 150px trigger zone with smooth animations
- Grid layout with image thumbnails
- Premium badge with gradient
- Click images for fullscreen preview
- Glassmorphism card design

**Keyboard Controls**
- `Space` / `P` - Play/Pause
- `→` / `N` - Next slide
- `←` / `B` - Previous slide
- `F` - Toggle fullscreen
- `Escape` - Exit fullscreen/preview

### 📱 Remote Control (`/remote`)
**Mobile Interface**
- Touch-optimized controls for smartphones/tablets
- Large, easy-to-tap buttons
- Real-time sync with display via Supabase Realtime
- QR code access from admin dashboard

**Control Features**
- Play/Pause toggle
- Next/Previous navigation
- Current slide information display
- Connection status indicator
- Responsive design for all screen sizes

**Realtime Communication**
- Bi-directional WebSocket sync
- Instant command propagation
- Status updates from display
- Heartbeat channel for reliable connection
- Auto-reconnect on disconnect

### 🔒 Security & Reliability
**Authentication**
- Password-protected admin access
- HTTP-only cookie sessions
- Token-based API authorization
- Server-side validation

**Database Security**
- Supabase Row Level Security (RLS) policies
- Service role for admin operations only
- Anon key for public read access
- Tested RLS policies (`test-rls.html`)

**Error Handling**
- Graceful degradation on failures
- Automatic retry for transient errors
- Corrupt video detection and cleanup
- Orphaned file cleanup
- Comprehensive error logging

### ⚙️ Technical Features
**Performance**
- Optimized FFmpeg encoding (H.264, yuv420p)
- Sharp for thumbnail generation
- Image preloading for smooth transitions
- Lazy loading for admin components
- Resource hints for faster loading

**Monitoring**
- Upload task tracking
- Video generation progress
- Storage usage statistics
- Active image count
- Real-time status updates

## Architecture & Stack
- **Frontend:** Next.js 14, React 18, Tailwind CSS, glassmorphism UI
- **Backend:** Next.js API Routes + Supabase (PostgreSQL, Storage, Realtime)
- **Media Processing:** FFmpeg via `@ffmpeg-installer/ffmpeg`
- **Deployment:** Vercel-ready (works locally or self-hosted Node.js)

## Getting Started
### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project (URL, anon key, service role key)

### Installation
```bash
git clone https://github.com/imrosyd/slideshow.git
cd slideshow
npm install

cp .env.example .env.local
# edit .env.local with your Supabase credentials (see table below)

npm run dev        # http://localhost:3000 (fallback 3001)
# npm run build && npm start for production
```

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | ✅ | Password for `/admin` login (stored server-side) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL (safe for client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only operations) |
| `SUPABASE_STORAGE_BUCKET` | ⬜️ | Custom storage bucket name (default `slideshow-images`) |
| `SUPABASE_DURATIONS_TABLE` | ⬜️ | Custom table name for durations (default `image_durations`) |

## Supabase Setup
1. **Storage buckets:** `slideshow-images` (media/PDF) and `slideshow-videos` (generated MP4).
2. **SQL migrations:** run the files in `supabase/` sequentially (`001`–`004`) to create tables, settings, metadata, and enable RLS.
3. **Storage policies:** allow public `SELECT` for both buckets; allow full access for service role.
4. **Test RLS:** open `test-rls.html`, input Supabase URL & anon key, click *Initialize* → *Run All Tests* and ensure every check passes.

## Usage
- `/` — fullscreen slideshow player (optimized for TV/webOS)
- `/admin` — authenticated dashboard for upload, metadata editing, and video generation
- `/remote` — mobile-friendly remote control with realtime sync

## Advanced Video Encoding (optional)
Configure values in `slideshow_settings` to tweak FFmpeg without redeploying:

| Key | Default | Notes |
|-----|---------|-------|
| `video_crf` | `22` | Quality (lower = better quality, larger file) |
| `video_preset` | `veryfast` | Encoding speed (`ultrafast` … `veryslow`) |
| `video_profile` | `high` | H.264 profile (`baseline`, `main`, `high`) |
| `video_level` | `4.0` | H.264 level (3.1, 4.0, 4.2, …) |
| `video_fps` | `24` | Frames per second |
| `video_gop` | `48` | Keyframe interval (defaults to 2 × fps) |
| `video_width` | `1920` | Output width (keeps aspect via scale+pad) |
| `video_height` | `1080` | Output height (keeps aspect via scale+pad) |

## Available Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build production assets |
| `npm start` | Run the production server |
| `npm run lint` | Run ESLint + TypeScript checks |

## Troubleshooting
**Playback & UI**

| Issue | Fix |
|-------|-----|
| TV screen sleeps/blank | Ensure MP4 is H.264 + yuv420p (defaults already), verify keep-awake logs, maintain stable connection |
| Video will not start on webOS | Confirm duration ≥2s, inspect with `ffmpeg -i file.mp4`, check console for webOS detection |
| Fullscreen warnings | Browser requires a user gesture — click or tap once |
| Realtime warnings | Fixed since v1.3 using `httpSend()`; safe to ignore on latest build |

**Database & RLS**

| Issue | Fix |
|-------|-----|
| Policies not applied | Re-run `004_enable_row_level_security.sql`, confirm RLS toggled on, use `test-rls.html` |
| Service role upload error | Double-check `SUPABASE_SERVICE_ROLE_KEY`; never expose it to client code |

## Recent Updates (v2.2.0)
- **Video Resume Bug Fixed**: Videos now properly resume from pause position when closing image overlay instead of restarting
- **Consistent Browser Tab Title**: Main page now displays "Slideshow" in browser tab across all states
- **Project Cleanup**: Removed unused debug scripts and cache files (~530KB cleanup) for cleaner codebase
- **Smart Video Position Tracking**: Added advanced position tracking using refs for smooth pause/resume functionality

## Previous Updates (v2.1.0)
- **Merge to Video Enhancement**: Reduced minimum images from 2 to 1 for single-image video conversion
- Glassmorphism UI design with auto-hide gallery and fullscreen preview
- Individual MP4 per image with manual trigger (no more batch generation)
- Enhanced bulk operations with bulk edit dialog and search/filter
- PDF-to-images conversion support
- Force refresh and cleanup tools for maintenance
- Double-transition bug fixed with preload timeout fallback
- Enhanced keep-awake + smooth transitions for webOS TVs
- Comprehensive security with tested RLS policies

## Changelog, License, Author
- Full history: [CHANGELOG.md](CHANGELOG.md)
- License: [MIT](LICENSE)
- Author: **Imron** ([@imrosyd](https://github.com/imrosyd))

---

Made with ❤️ for unstoppable slideshow dashboards.

# 📺 Slideshow Display System

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage%20%26%20DB-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> All-in-one digital signage dashboard for TV displays with Supabase storage, manual image/PDF → MP4 conversion, and webOS keep-awake optimizations.

🌐 **Language:** 🇺🇸 English · [🇮🇩 Indonesian](README.id.md)

**Last Updated:** November 8, 2025 · **Status:** Production ready

---

## Overview
Slideshow is a Next.js 14 + TypeScript application for managing always-on TV content. Admins upload images or PDFs, fine-tune durations, captions, and order, then trigger one-click FFmpeg conversion to MP4 so displays can play buttery-smooth loops on LG webOS or any modern screen.

## Feature Highlights
- **Admin Console**
  - Drag-and-drop uploads (images/PDF) directly to Supabase Storage
  - Edit filename, caption, duration, ordering, visibility, and delete assets safely
  - Manual per-image MP4 generation with optimized libx264/yuv420p presets
  - PDF preview & conversion to images before scheduling
- **Display Player (TV)**
  - Endless playlist with retry logic, preload buffer, and keep-awake guards (Wake Lock + webOS Power Manager)
  - Auto refresh every 60s, smooth transitions, fullscreen + keyboard shortcuts
- **Remote & On-screen Controls**
  - `/remote` page for play/pause/jump actions with realtime sync
  - On-screen floating UI (distance triggered, auto-hide, pause/resume/next/previous)
- **Reliability & Security**
  - Supabase RLS with tested policies (`test-rls.html`)
  - Service role used only server-side, automatic cleanup for orphan/corrupt files

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

## Recent Updates
- Individual MP4 per image with manual trigger (no more batch generation)
- Double-transition bug fixed with preload timeout fallback
- Enhanced keep-awake + smooth transitions for webOS TVs
- Updated troubleshooting and documentation structure

## Changelog, License, Author
- Full history: [CHANGELOG.md](CHANGELOG.md)
- License: [MIT](LICENSE)
- Author: **Imron** ([@imrosyd](https://github.com/imrosyd))

---

Made with ❤️ for unstoppable slideshow dashboards.

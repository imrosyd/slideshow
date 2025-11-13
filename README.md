# 📺 Slideshow Display System

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Optional-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Flexible digital signage system with multiple deployment options: Supabase, VPS, Docker, or localhost. Supports both cloud and self-hosted configurations.

🌐 **Language:** 🇺🇸 English · [🇮🇩 Indonesian](README.id.md)

**Last Updated:** November 13, 2025 · **Status:** ✅ Production Ready

[![GitHub Release](https://img.shields.io/github/v/release/imrosyd/slideshow)](https://github.com/imrosyd/slideshow/releases)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/imrosyd/slideshow)
[![Code Size](https://img.shields.io/github/languages/code-size/imrosyd/slideshow)](https://github.com/imrosyd/slideshow)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Deployment Options](#deployment-options)
  - [Quick Comparison](#quick-comparison)
  - [1. Supabase Only (Cloud)](#1-supabase-only-cloud)
  - [2. VPS/Server (Self-Hosted)](#2-vpsserver-self-hosted)
  - [3. Docker (Container)](#3-docker-container)
  - [4. Shared Hosting (cPanel)](#4-shared-hosting-cpanel)
  - [5. Local Development](#5-local-development)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

Slideshow is a Next.js 14 + TypeScript application for managing always-on TV content. Features include:

- **Flexible Database**: Prisma + PostgreSQL with automatic Supabase fallback
- **Multiple Storage Options**: Supabase Storage, Filesystem, or S3-compatible
- **Video Processing**: FFmpeg-powered image-to-MP4 conversion
- **Remote Control**: Mobile-friendly control interface
- **WebOS Optimized**: Keep-awake features for LG TV displays

---

## Features

### 🎨 Admin Dashboard (`/admin`)

**Upload & Management**
- Drag-and-drop uploads (JPG, PNG, GIF, PDF)
- PDF-to-images conversion with preview
- Bulk upload with progress tracking
- Search and filter images
- Real-time upload status

**Image Organization**
- Drag-and-drop reordering
- Hide/show images without deletion
- Rename files with extension preservation
- Bulk operations (edit, delete)
- Individual metadata editing

**Video Generation**
- Per-image MP4 generation with FFmpeg
- Merge multiple images into single video
- Custom duration per image
- Video preview and management
- Progress indicators

**Maintenance Tools**
- Force refresh displays remotely
- Cleanup corrupt videos
- Database consistency checks
- Storage statistics

### 📺 Display Player (`/`)

**Playback Features**
- Fullscreen slideshow for TV displays
- Smooth transitions
- Auto-advance with configurable durations
- Preload buffer for seamless playback
- Auto-refresh every 60 seconds

**Display Management**
- Keep display awake (Wake Lock API + webOS)
- Prevent TV sleep
- WebOS-specific optimizations
- Keyboard shortcuts

**Keyboard Controls**
- `Space`/`P` - Play/Pause
- `→`/`N` - Next slide
- `←`/`B` - Previous slide
- `F` - Toggle fullscreen
- `Esc` - Exit fullscreen

### 📱 Remote Control (`/remote`)

- Touch-optimized mobile interface
- Play/Pause, Next/Previous controls
- Real-time sync with display
- Authentication required

---

## Tech Stack

### Core
- **Framework**: Next.js 14 (React 18, TypeScript 5.3)
- **Database**: Prisma 6.19 + PostgreSQL
- **Storage**: Supabase Storage / Filesystem / S3
- **Styling**: Tailwind CSS 3.4, Glassmorphism UI

### Media Processing
- **Video**: FFmpeg (via @ffmpeg-installer)
- **Images**: Sharp (resize, optimize)
- **PDF**: pdf-lib + pdfjs-dist

### Deployment
- **Serverless**: Vercel / Netlify
- **Self-Hosted**: VPS (PM2 + Nginx)
- **Container**: Docker + Docker Compose
- **Database**: PostgreSQL / Supabase / Neon.tech / Railway

---

## Deployment Options

### Quick Comparison

| Option | Setup Time | Cost/Month | Best For | Control |
|--------|------------|------------|----------|---------|
| **Supabase Only** | 5 min | $0-25 | Quick start, prototype | Low |
| **VPS** | 20 min | $5-20 | Production, full control | High |
| **Docker** | 10 min | $5-20 | Portability, easy scaling | Medium |
| **Shared Hosting** | 30 min | $2-10 | Existing hosting, budget | Low |
| **Local** | 5 min | $0 | Development, testing | High |

---

### 1. Supabase Only (Cloud)

**Best for:** Quick deployment, no server management

#### Prerequisites
- Supabase account (free tier available)
- Vercel account (optional, for hosting)

#### Step 1: Setup Supabase

```bash
# 1. Create Supabase project at https://supabase.com
# 2. Go to Project Settings → Database → Connection String
# 3. Run SQL migration in SQL Editor:
```

```sql
-- Run this in Supabase SQL Editor
-- Create tables
CREATE TABLE IF NOT EXISTS image_durations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  duration_ms INTEGER DEFAULT 5000,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  video_url TEXT,
  video_duration_ms INTEGER,
  video_status TEXT DEFAULT 'none',
  is_video BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS slideshow_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  page TEXT NOT NULL,
  session_id TEXT NOT NULL,
  browser_id TEXT
);

-- Insert default settings
INSERT INTO slideshow_settings (key, value) VALUES 
  ('transition_type', 'fade'),
  ('transition_duration', '1000')
ON CONFLICT (key) DO NOTHING;
```

#### Step 2: Setup Storage

```bash
# In Supabase Dashboard:
# 1. Go to Storage → Create bucket "slideshow-images"
# 2. Create bucket "slideshow-videos"
# 3. Make both buckets public (Settings → Public bucket)
```

#### Step 3: Deploy Application

**Option A: Vercel (Recommended)**

```bash
# Clone repository
git clone https://github.com/your-repo/slideshow.git
cd slideshow

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard:
```

```env
# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_STORAGE_BUCKET=slideshow-images

# Admin password
ADMIN_PASSWORD=your_secure_password
```

**Option B: Local with Supabase**

```bash
# Clone and install
git clone https://github.com/your-repo/slideshow.git
cd slideshow
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_STORAGE_BUCKET=slideshow-images
ADMIN_PASSWORD=your_password
EOF

# Run
npm run dev
```

✅ **Done!** Access at http://localhost:3000

---

### 2. VPS/Server (Self-Hosted)

**Best for:** Production, full control, no vendor lock-in

#### Prerequisites
- Ubuntu 20.04+ / Debian 11+ server
- Root or sudo access
- Domain name (optional)

#### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (web server)
sudo apt install -y nginx

# Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Setup PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE slideshow_db;
CREATE USER slideshow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE slideshow_db TO slideshow_user;
\q
EOF
```

#### Step 3: Deploy Application

```bash
# Clone application
cd /var/www
sudo git clone https://github.com/your-repo/slideshow.git
cd slideshow

# Install dependencies
sudo npm install --production
sudo npx prisma generate

# Create production environment
sudo nano .env.production
```

```env
# Database (Prisma)
DATABASE_URL=postgresql://slideshow_user:your_password@localhost:5432/slideshow_db

# Storage (Filesystem)
USE_FILESYSTEM_STORAGE=true
STORAGE_PATH=/var/www/slideshow/storage
STORAGE_PUBLIC_URL=/api/storage

# Admin
ADMIN_PASSWORD=your_secure_password

# App
NODE_ENV=production
PORT=3000
```

```bash
# Setup database schema
sudo npx prisma db push

# Build application
sudo npm run build

# Create storage directory
sudo mkdir -p storage/images storage/videos
sudo chown -R www-data:www-data storage

# Start with PM2
pm2 start npm --name slideshow -- start
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/slideshow
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Change this

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Optional: Serve storage files directly (better performance)
    location /storage/ {
        alias /var/www/slideshow/storage/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/slideshow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL (optional but recommended)
sudo certbot --nginx -d your-domain.com

# Allow firewall
sudo ufw allow 'Nginx Full'
```

✅ **Done!** Access at https://your-domain.com

#### Maintenance Commands

```bash
# View logs
pm2 logs slideshow

# Restart application
pm2 restart slideshow

# Update application
cd /var/www/slideshow
git pull
npm install
npx prisma generate
npm run build
pm2 restart slideshow

# Backup database
pg_dump -U slideshow_user slideshow_db > backup.sql

# Restore database
psql -U slideshow_user slideshow_db < backup.sql
```

---

### 3. Docker (Container)

**Best for:** Portability, easy deployment, consistent environment

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Step 1: Create Configuration Files

**docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: slideshow-postgres
    environment:
      POSTGRES_DB: slideshow_db
      POSTGRES_USER: slideshow_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - slideshow-network
    restart: unless-stopped

  app:
    build: .
    container_name: slideshow-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://slideshow_user:your_secure_password@postgres:5432/slideshow_db
      ADMIN_PASSWORD: your_admin_password
      USE_FILESYSTEM_STORAGE: "true"
      STORAGE_PATH: /app/storage
      NODE_ENV: production
    volumes:
      - ./storage:/app/storage
    depends_on:
      - postgres
    networks:
      - slideshow-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  slideshow-network:
```

**Dockerfile**
```dockerfile
FROM node:20-alpine AS base

# Install dependencies for Sharp and FFmpeg
RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Create storage directory
RUN mkdir -p storage/images storage/videos

EXPOSE 3000

# Start command
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
```

**.dockerignore**
```
node_modules
.next
.git
.env*
storage
*.md
```

#### Step 2: Deploy

```bash
# Clone repository
git clone https://github.com/your-repo/slideshow.git
cd slideshow

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down

# Update application
git pull
docker-compose up -d --build
```

✅ **Done!** Access at http://localhost:3000

#### Docker Management

```bash
# View running containers
docker ps

# Access app shell
docker exec -it slideshow-app sh

# View logs
docker logs slideshow-app

# Backup database
docker exec slideshow-postgres pg_dump -U slideshow_user slideshow_db > backup.sql

# Restart services
docker-compose restart
```

---

### 4. Shared Hosting (cPanel)

**Best for:** Existing hosting, budget-friendly, limited resources

⚠️ **Important Limitations:**
- Shared hosting has strict resource limits
- FFmpeg video processing may not work or be very slow
- Long-running processes are often restricted
- Node.js version may be limited

#### Prerequisites
- Shared hosting with Node.js support (cPanel/Plesk)
- MySQL or PostgreSQL database access
- SSH access (optional but helpful)

#### Compatible Providers
These providers support Node.js on shared hosting:
- **Hostinger** (Node.js selector in cPanel)
- **Namecheap** (Node.js available on higher plans)
- **A2 Hosting** (Node.js with cPanel)
- **DreamHost** (Node.js support)

#### Option A: cPanel with Node.js Selector

**Step 1: Setup Database**

Most shared hosting provides MySQL. We'll use MySQL instead of PostgreSQL:

1. Login to cPanel → MySQL Databases
2. Create database: `username_slideshow`
3. Create user: `username_slide` with strong password
4. Add user to database with ALL PRIVILEGES

**Step 2: Setup Application**

```bash
# SSH into your hosting (or use File Manager + Terminal in cPanel)
cd ~/public_html/slideshow  # or your desired directory

# Upload files (via FTP or git)
# If git is available:
git clone https://github.com/your-repo/slideshow.git .

# Or upload via FTP/cPanel File Manager

# Install dependencies (use cPanel Node.js selector)
npm install --production

# Generate Prisma client
npx prisma generate
```

**Step 3: Configure Environment**

Create `.env.production`:
```env
# Database - Use MySQL if PostgreSQL not available
DATABASE_URL=mysql://username_slide:password@localhost:3306/username_slideshow

# Or if PostgreSQL is available
# DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Storage - Use filesystem (limited space on shared hosting)
USE_FILESYSTEM_STORAGE=true
STORAGE_PATH=./storage
STORAGE_PUBLIC_URL=/api/storage

# Admin password
ADMIN_PASSWORD=your_secure_password

# App config
NODE_ENV=production
PORT=3000  # cPanel will assign port automatically
```

**Step 4: Setup Database Schema**

```bash
# Push Prisma schema to database
npx prisma db push

# If using MySQL, Prisma will auto-convert
```

**Step 5: Build Application**

```bash
npm run build
```

**Step 6: Configure Node.js App in cPanel**

1. Go to cPanel → Setup Node.js App
2. Click "Create Application"
3. Configure:
   - **Node.js version**: 20.x (or highest available)
   - **Application mode**: Production
   - **Application root**: `/home/username/public_html/slideshow`
   - **Application URL**: `yourdomain.com` or subdomain
   - **Application startup file**: `server.js`
   - **Environment variables**: Add from .env.production

4. Create `server.js` in root:
```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

5. Click "Start App"

**Step 7: Setup .htaccess (if using subdirectory)**

Create `.htaccess` in public_html:
```apache
RewriteEngine On
RewriteRule ^slideshow(.*)$ http://127.0.0.1:3000$1 [P,L]
```

✅ **Done!** Access at `https://yourdomain.com/slideshow`

#### Option B: Shared Hosting WITHOUT Node.js

If your hosting doesn't support Node.js, you have alternatives:

**1. Use External Backend (Hybrid)**

- Host static files on shared hosting
- Use Vercel/Railway for Next.js backend
- Use shared hosting's MySQL for database

```bash
# Build static export
npm run build
npm run export  # Requires next.config.js modification

# Upload 'out' folder to shared hosting
```

**2. Upgrade to Better Hosting**

Consider these affordable options with Node.js:
- **Railway.app**: $5/month, easy deployment
- **DigitalOcean Droplet**: $4/month, full VPS
- **Hostinger VPS**: $4/month, cPanel included
- **Vercel**: Free tier, automatic deployments

#### Shared Hosting Limitations

❌ **What WON'T work:**
- FFmpeg video generation (too resource-intensive)
- Large file uploads (usually 50-100MB limit)
- Long-running processes (timeout after 30-60s)
- High concurrent users (resource limits)

✅ **What WILL work:**
- Image slideshow display
- Image upload (with size limits)
- Admin dashboard
- Remote control
- Basic image management

#### Workarounds for Video Generation

If you need video generation on shared hosting:

1. **Use External Service**: Process videos on your local machine, then upload
2. **Cloudflare Workers**: Use for video processing (paid)
3. **Upgrade Plan**: Get VPS hosting for $5/month

#### Recommended Alternative

For best experience, consider:
- **Vercel (Free)** + **Neon.tech (Free)** = $0/month
- Better than shared hosting, easier setup
- See "1. Supabase Only" section above

---

### 5. Local Development

**Best for:** Development, testing, learning

#### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or Docker)

#### Option A: With Local PostgreSQL

```bash
# Install PostgreSQL
# Ubuntu/Debian:
sudo apt install postgresql

# macOS:
brew install postgresql@16
brew services start postgresql@16

# Windows:
# Download from https://www.postgresql.org/download/windows/

# Create database
createdb slideshow_db

# Clone repository
git clone https://github.com/your-repo/slideshow.git
cd slideshow
npm install

# Create .env.local
cat > .env.local << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/slideshow_db
ADMIN_PASSWORD=admin123
USE_FILESYSTEM_STORAGE=true
STORAGE_PATH=./storage
STORAGE_PUBLIC_URL=/api/storage
EOF

# Setup database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

#### Option B: With Docker PostgreSQL

```bash
# Start PostgreSQL in Docker
docker run -d --name postgres \
  -e POSTGRES_DB=slideshow_db \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine

# Clone and setup
git clone https://github.com/your-repo/slideshow.git
cd slideshow
npm install

# Create .env.local (same as above)
# Run
npm run dev
```

#### Option C: With Supabase (Hybrid)

Use Supabase for database but run locally:

```bash
# Create Supabase project at https://supabase.com
# Get connection string from Project Settings → Database

# Clone and setup
git clone https://github.com/your-repo/slideshow.git
cd slideshow
npm install

# Create .env.local with Supabase credentials
cat > .env.local << EOF
# Option 1: Use Supabase Database directly
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Option 2: Use Supabase SDK (original method)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_STORAGE_BUCKET=slideshow-images

ADMIN_PASSWORD=admin123
EOF

# Setup and run
npx prisma generate
npx prisma db push  # Only if using DATABASE_URL
npm run dev
```

✅ **Done!** Access at http://localhost:3000

---

## Configuration

### Environment Variables

#### Required

```env
# Authentication
ADMIN_PASSWORD=your_secure_password

# Choose ONE database option:

# Option 1: Prisma + PostgreSQL (Recommended)
DATABASE_URL=postgresql://user:password@host:5432/database

# Option 2: Supabase SDK (Original)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_STORAGE_BUCKET=slideshow-images
```

#### Storage Options

```env
# Option 1: Filesystem (Self-hosted)
USE_FILESYSTEM_STORAGE=true
STORAGE_PATH=/path/to/storage
STORAGE_PUBLIC_URL=/api/storage

# Option 2: Supabase Storage (Cloud)
# (Use Supabase credentials above)

# Option 3: S3-Compatible (Future)
# S3_ENDPOINT=https://...
# S3_BUCKET_NAME=slideshow
# S3_ACCESS_KEY_ID=xxx
# S3_SECRET_ACCESS_KEY=xxx
```

#### Optional

```env
NODE_ENV=production
PORT=3000
```

### Database Priority

The application automatically detects which database to use:

1. **Prisma** (if `DATABASE_URL` is set) → Uses Prisma Client
2. **Supabase** (fallback) → Uses Supabase SDK

### Storage Priority

1. **Filesystem** (if `USE_FILESYSTEM_STORAGE=true`)
2. **Supabase Storage** (fallback)

---

## Usage Guide

### Admin Dashboard

1. **Login**: Navigate to `/admin` and enter password
2. **Upload Images**: Drag files or click upload button
3. **Organize**: Drag to reorder, toggle visibility
4. **Edit Metadata**: Click edit icon to change duration/caption
5. **Generate Video**: Select images → Click "Merge to Video"
6. **Force Refresh**: Update displays remotely

### Display Setup

1. Open browser on TV: `https://your-domain.com`
2. Slideshow starts automatically
3. Press `F` for fullscreen
4. TV keeps awake automatically (webOS)

### Remote Control

1. Open on mobile: `https://your-domain.com/remote`
2. Login with admin password
3. Control slideshow remotely

---

## API Documentation

### Authentication

```bash
POST /api/auth
Content-Type: application/json

{
  "password": "your_password"
}

Response: { "authenticated": true, "userId": "..." }
```

### Upload Image

```bash
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>

Response: { "success": true, "filename": "image.jpg" }
```

### Get Images

```bash
GET /api/admin/images
Authorization: Bearer <token>

Response: {
  "images": [
    {
      "name": "image.jpg",
      "durationMs": 5000,
      "caption": "Caption",
      "hidden": false
    }
  ]
}
```

### Update Metadata

```bash
PUT /api/admin/metadata
Authorization: Bearer <token>
Content-Type: application/json

[
  {
    "filename": "image.jpg",
    "durationMs": 8000,
    "caption": "New caption",
    "hidden": false
  }
]

Response: { "success": true, "count": 1 }
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql "postgresql://user:pass@host:5432/database"

# Check Prisma
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

### Storage Issues

```bash
# Check permissions (Linux)
sudo chown -R www-data:www-data storage
chmod -R 755 storage

# Create directories
mkdir -p storage/images storage/videos
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Use different port
PORT=3001 npm start
```

### Build Errors

```bash
# Clear cache
rm -rf .next node_modules package-lock.json

# Reinstall
npm install

# Regenerate Prisma
npx prisma generate
```

### FFmpeg Issues

```bash
# Check FFmpeg
ffmpeg -version

# Install (Ubuntu)
sudo apt install ffmpeg

# Install (macOS)
brew install ffmpeg
```

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Latest Releases

#### v2.5.0 (2025-11-13) - Current
**Multiple Deployment Options & Code Cleanup**
- ✅ 5 deployment options: Supabase, VPS, Docker, Shared Hosting, Local
- ✅ Comprehensive README with all guides consolidated
- ✅ Filesystem storage adapter with auto-fallback
- ✅ Shared hosting support (cPanel Node.js)
- ✅ Code cleanup: removed unused dependencies and obsolete features
- ✅ Performance: smaller bundle, faster builds

#### v2.4.0 (2025-11-13)
**Prisma Integration & Database Flexibility**
- Prisma ORM with auto-fallback to Supabase
- Database abstraction layer
- Type-safe operations
- Support for any PostgreSQL database

#### v2.3.0 (2025-11-12)
**Authentication & Session Management**
- Remote page authentication
- Single concurrent session control
- Browser fingerprinting
- Smart session management

#### v2.2.1 (2025-11-11)
**Real-time Updates**
- Auto-refresh gallery without page reload
- Supabase Realtime integration

### Migration Guide

#### From v2.4.x to v2.5.0
No breaking changes. Simply:
1. `git pull origin main`
2. `npm install` (some dependencies removed)
3. `npx prisma generate` (if using Prisma)
4. Done!

#### From v2.3.x to v2.4.0
Add to `.env`:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db  # Optional
```
Then:
```bash
npm install
npx prisma generate
npx prisma db push  # Only if using Prisma
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/imrosyd/slideshow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/imrosyd/slideshow/discussions)
- **Email**: support@yourdomain.com

---

## Acknowledgments

- Next.js team for amazing framework
- Supabase for cloud infrastructure
- FFmpeg for video processing
- Prisma for database toolkit

---

**Made with ❤️ by imrosyd**

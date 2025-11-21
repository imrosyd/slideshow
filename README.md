# 📺 Slideshow Display System

[![Version](https://img.shields.io/badge/version-3.2.1-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)
[removed Supabase badge]
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Flexible digital signage system with multiple deployment options: VPS, Docker, or localhost. Supports both cloud and self-hosted configurations.

🌐 **Language:** 🇺🇸 English · [🇮🇩 Indonesian](README.id.md)

**Last Updated:** November 21, 2025 · **Status:** ✅ Production Ready

[![GitHub Release](https://img.shields.io/github/v/release/imrosyd/slideshow)](https://github.com/imrosyd/slideshow/releases)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/imrosyd/slideshow)
[![Code Size](https://img.shields.io/github/languages/code-size/imrosyd/slideshow)](https://github.com/imrosyd/slideshow)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Deployment Options](#deployment-options)
  - [Quick Comparison](#quick-comparison)
  - [1. VPS/Server (Self-Hosted)](#1-vpsserver-self-hosted)
  - [2. Docker (Container)](#2-docker-container)
  - [3. Local Development](#3-local-development)
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

- **Flexible Database**: Prisma + PostgreSQL (Prisma is the recommended/primary adapter)
- **Multiple Storage Options**: Filesystem or S3-compatible
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

- ### Core
- **Framework**: Next.js 14 (React 18, TypeScript 5.3)
- **Database**: Prisma 6.19 + PostgreSQL
- **Storage**: Filesystem / S3
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

## Project Structure

```
├── components/        # React components
├── hooks/             # Custom React hooks
├── lib/               # Utilities (DB, Storage, Auth)
├── pages/             # Next.js pages & API routes
│   ├── api/           # Backend API endpoints
│   ├── admin.tsx      # Admin dashboard
│   ├── index.tsx      # Main slideshow player
│   └── login.tsx      # Authentication page
├── prisma/            # Database schema & seed
├── public/            # Static assets
├── scripts/           # Maintenance scripts
├── storage/           # Local file storage (if enabled)
└── styles/            # Global styles & Tailwind
```

---

## Deployment Options

### Quick Comparison

| Option | Setup Time | Cost/Month | Best For | Control |
|--------|------------|------------|----------|---------|
| **VPS** | 20 min | $5-20 | Production, full control | High |
| **Docker** | 10 min | $5-20 | Portability, easy scaling | Medium |
| **Local** | 5 min | $0 | Development, testing | High |

---

### 1. VPS/Server (Self-Hosted)

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
sudo git clone https://github.com/imrosyd/slideshow.git
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

# Create superadmin user
sudo npx prisma db seed

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
sudo cp nginx.conf /etc/nginx/sites-available/slideshow
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

### 2. Docker (Container)

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
git clone https://github.com/imrosyd/slideshow.git
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

### 3. Local Development

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
git clone https://github.com/imrosyd/slideshow.git
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
npx prisma db seed

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
git clone https://github.com/imrosyd/slideshow.git
cd slideshow
npm install

# Create .env.local (same as above)
# Run
npm run dev
```

#### Notes on Supabase

This project is now Prisma-first. If you host a Postgres database on Supabase you can still use it by setting `DATABASE_URL` to the Supabase Postgres connection string (so Prisma talks to it), but Supabase SDK-specific environment variables are no longer required and the repository no longer documents a Supabase-specific workflow.

For local development use the Prisma workflow shown in Option A/B above and set `DATABASE_URL` accordingly. Example:

```bash
# Example: use a hosted Postgres or Supabase Postgres by setting DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@db.example.com:5432/postgres"
npx prisma generate
npx prisma db push
npx prisma db seed
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

# Database (Prisma + PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database
```

#### Storage Options

```env
# Option 1: Filesystem (Self-hosted)
USE_FILESYSTEM_STORAGE=true
STORAGE_PATH=/path/to/storage
STORAGE_PUBLIC_URL=/api/storage

# Option 2: S3-compatible Storage (Cloud)
# Configure S3 env vars when using S3

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

The application uses Prisma as the primary database adapter. Set `DATABASE_URL` to enable Prisma.

### Storage Priority

1. **Filesystem** (if `USE_FILESYSTEM_STORAGE=true`)
2. **S3-compatible Storage** (fallback)

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

### Prisma: "Environment variable not found: DATABASE_URL"

If you see an error like:

```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Environment variable not found: DATABASE_URL.
```

This means Prisma cannot find the `DATABASE_URL` environment variable. Common causes and fixes:

- **Missing `.env` file or variable**: Create a `.env` (or `.env.production`) file from `.env.example` and set `DATABASE_URL`:

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL, then:
npx prisma generate
npx prisma db push
```

- **Don't run Prisma with `sudo`**: Running `sudo npx prisma db push` often *loses your environment variables* because the command runs as `root`. Instead run the command as the same user that owns the project:

```bash
# Recommended (no sudo)
npx prisma db push

# Or provide the value inline (temporary)
DATABASE_URL="postgresql://user:pass@host:5432/db" npx prisma db push
```

- **If you must use `sudo`**: preserve the environment with `-E` (only when appropriate and permitted on your server):

```bash
sudo -E npx prisma db push
```

Note: the safest approach on a VPS is to create a proper `.env` (owned by the deploy user) and run `npx prisma db push` without `sudo`. Running as the deploy user avoids permission surprises and ensures Prisma reads the `.env` file.


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

#### v3.2.0 (2025-11-21) - Current
**Superadmin & Maintenance**
- ✅ **Superadmin Auto-Creation**: `npx prisma db seed` to create default admin
- ✅ **Nginx Config**: Default configuration included
- ✅ **Cleanup**: Removed unused files and placeholders

#### v3.0.0 (2025-11-19)
**Multiple Deployment Options & Code Cleanup**
- ✅ 5 deployment options: Supabase, VPS, Docker, Shared Hosting, Local
 - ✅ 4 deployment options: VPS, Docker, Shared Hosting, Local
- ✅ Comprehensive README with all guides consolidated
- ✅ Filesystem storage adapter with auto-fallback
- ✅ Shared hosting support (cPanel Node.js)
- ✅ Code cleanup: removed unused dependencies and obsolete features
- ✅ Performance: smaller bundle, faster builds

#### v2.4.0 (2025-11-13)
**Prisma Integration & Database Flexibility**
- Prisma ORM (Prisma-first configuration)
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
- Local realtime via BroadcastChannel (no Supabase required)

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
- Cloud Postgres providers for hosted DB (e.g. Neon.tech, Railway)
- FFmpeg for video processing
- Prisma for database toolkit

---

**Made with ❤️ by imrosyd**

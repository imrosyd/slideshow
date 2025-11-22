# 📺 Slideshow Display System

[![Version](https://img.shields.io/badge/version-3.3.0-blue.svg)](https://github.com/imrosyd/slideshow/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Flexible digital signage system with multiple deployment options: VPS, Docker, or localhost. Supports both cloud and self-hosted configurations.

🌐 **Language:** 🇺🇸 English · [🇮🇩 Indonesian](README.id.md)

**Last Updated:** November 22, 2025 · **Status:** ✅ Production Ready

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
- [User Management](#user-management)
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
- **Database**: Prisma + PostgreSQL (hosted Postgres providers: Neon.tech, Railway, Supabase)

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

# Install FFmpeg (required for video processing)
sudo apt install -y ffmpeg

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (web server)
sudo apt install -y nginx

# Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Setup 8GB swap (prevents out-of-memory during video merge)
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Verify swap is active
free -h
```

#### Step 2: Setup PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user with proper permissions
sudo -u postgres psql <<EOF
CREATE DATABASE slideshow_db;
CREATE USER slideshow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE slideshow_db TO slideshow_user;

-- Connect to the database and grant schema permissions
\c slideshow_db
GRANT ALL ON SCHEMA public TO slideshow_user;
ALTER DATABASE slideshow_db OWNER TO slideshow_user;
\q
EOF
```

#### Step 3: Deploy Application

```bash
# Clone application
cd /var/www
sudo git clone https://github.com/imrosyd/slideshow.git
cd slideshow

# Set proper ownership (replace 'your_user' with your username)
sudo chown -R $USER:$USER /var/www/slideshow

# Install dependencies (NO sudo - important!)
npm install --production
npx prisma generate

# Create production environment file
nano .env
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
HOST=0.0.0.0
```

```bash
# Setup database schema (NO sudo!)
npx prisma db push

# Create superadmin user (NO sudo!)
npx prisma db seed

# Build application
npm run build

# Create storage directory with proper permissions
mkdir -p storage/images storage/videos
chmod -R 755 storage

# Start with PM2 in production mode
NODE_ENV=production pm2 start npm --name slideshow -- start
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

    # Timeout settings for long video processing operations
    proxy_connect_timeout 3600;
    proxy_send_timeout 3600;
    proxy_read_timeout 3600;
    send_timeout 3600;

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

Follow the same production steps as the `VPS/Server` installation above — the Docker deployment uses the same app build and runtime expectations. In practice this means:

- Build and install dependencies exactly as in the `VPS/Server` section (`npm install`, `npx prisma generate`, `npm run build`).
- Provide the same `DATABASE_URL`, `ADMIN_PASSWORD`, and storage environment variables to the container (set via `docker-compose` or environment file).
- Ensure FFmpeg and any system-level dependencies required for video processing are available in the container image (the VPS instructions install `ffmpeg` system-wide).

A minimal Docker workflow is still available if you prefer containers, but the canonical deployment steps and environment are identical to the VPS instructions — follow `### 1. VPS/Server (Self-Hosted)` and adapt only the process manager/packaging (PM2 → container runtime).

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
### 3. Local Development

Follow the `VPS/Server` installation steps for a consistent, production-like local setup. The only differences for local development are:

- Use a local Postgres instance (or Dockerized Postgres) and set `DATABASE_URL` to point to it.
- You can run the app with the development script (`npm run dev`) instead of a production process manager. The build, Prisma client generation, and seed steps are the same.

Quick local checklist:

```bash
# 1) Ensure local Postgres is running and accessible
# 2) Clone & install (same as VPS)
git clone https://github.com/imrosyd/slideshow.git
cd slideshow
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
# 3) Run dev server
npm run dev
```

This keeps one canonical set of installation steps (VPS/server) as the source of truth; apply them locally with environment-specific adjustments (database host, storage paths, ports).
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

## User Management

### Quick Commands

```bash
# Add new user (viewer)
npm run add-user <username> <password>

# Add new admin
npm run add-user <username> <password> admin

# List all users
npm run list-users

# Delete user (edit scripts/delete-user.ts first)
npm run delete-user

# Update user role (edit scripts/update-role.ts first)
npm run update-role
```

### Examples

**Add a viewer user:**
```bash
npm run add-user john password123
```

**Add an admin user:**
```bash
npm run add-user superadmin admin123 admin
```

**List all users:**
```bash
npm run list-users
```

Output:
```
👥 All Users:
════════════════════════════════════════════════════════════════════════════════

1. admin
   ID:      454d555b-0591-4e53-a309-9c0bd11a36bf
   Role:    👑 Admin
   Created: 11/21/2025, 2:11:00 PM
   Updated: 11/21/2025, 2:11:00 PM

2. viewer1
   ID:      d8af7b99-2d31-4d6d-b4ed-f0795318104a
   Role:    👤 Viewer
   Created: 11/22/2025, 8:36:14 AM
   Updated: 11/22/2025, 8:36:14 AM

════════════════════════════════════════════════════════════════════════════════
Total: 2 user(s)
```

### User Roles

- **Admin**: Full access to admin dashboard, can upload/edit/delete images, generate videos
- **Viewer**: Can only view slideshow and use remote control

### Documentation

For detailed user management guide, see:
- 📚 [User Management Guide](docs/USER_MANAGEMENT.md) - Complete documentation
- 🚀 [Quick Add User](docs/QUICK_ADD_USER.md) - Quick reference

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

**Error: `FFmpeg exited with code null`**

This means FFmpeg is not installed or cannot be executed:

```bash
# Check if FFmpeg is installed
ffmpeg -version
which ffmpeg

# Install FFmpeg (Ubuntu/Debian)
sudo apt update
sudo apt install -y ffmpeg

# Install FFmpeg (macOS)
brew install ffmpeg

# Verify installation
ffmpeg -version
```

If FFmpeg is installed but still fails, check:

```bash
# Verify the package can find FFmpeg
cd /var/www/slideshow
node -e "const ffmpeg = require('@ffmpeg-installer/ffmpeg'); console.log(ffmpeg.path)"

# Reinstall if needed
npm install @ffmpeg-installer/ffmpeg --force
```

### Seed Command Errors

**Error: `spawn ts-node ENOENT`**

The `ts-node` command is not found. This is already fixed in `package.json` but if you encounter it:

```bash
# Verify package.json has npx ts-node
grep "seed" package.json
# Should show: "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"

# If not, edit package.json and add npx before ts-node
```

**Error: `Could not find a declaration file for module 'bcrypt'`**

TypeScript cannot find type definitions. This is fixed in `prisma/seed.ts` by using `require` instead of `import`:

```typescript
// In prisma/seed.ts, use:
const bcrypt = require('bcrypt');

// Instead of:
import bcrypt from 'bcrypt';
```

**Error: `Cannot find name 'process'`**

Missing Node.js type definitions. Already fixed in `tsconfig.json`:

```json
{
  "compilerOptions": {
    ...
    "types": ["node"]
  }
}
```

### PostgreSQL Permission Errors

**Error: `permission denied for schema public`**

The database user doesn't have permission to create tables:

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Grant permissions
\c slideshow_db
GRANT ALL ON SCHEMA public TO slideshow_user;
ALTER DATABASE slideshow_db OWNER TO slideshow_user;
\q
```

### PM2 and Port Conflicts

**Error: `EADDRINUSE: address already in use ::1:3000`**

Port 3000 is already in use, usually by multiple PM2 instances:

```bash
# Stop all PM2 processes
pm2 delete all

# Kill any remaining processes on port 3000
sudo fuser -k 3000/tcp

# Or find and kill manually
sudo lsof -i :3000
sudo kill -9 <PID>

# Start only ONE instance
cd /var/www/slideshow
NODE_ENV=production pm2 start npm --name slideshow -- start
pm2 save
```

### 502 Bad Gateway

**Nginx shows 502 error**

This means Nginx cannot connect to the application:

```bash
# Check if application is running
pm2 status

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Check PM2 logs for errors
pm2 logs slideshow --lines 50

# Common fixes:
# 1. Application not started
pm2 start slideshow

# 2. Application crashed - check logs
pm2 logs slideshow

# 3. Wrong proxy_pass in Nginx - should be localhost:3000
sudo nano /etc/nginx/sites-available/slideshow
# Change to: proxy_pass http://localhost:3000;
```

### Memory and Swap Issues

**Application crashes during video merge**

Out of memory errors during FFmpeg processing:

```bash
# Check current memory and swap
free -h

# If swap is 0, add 8GB swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
free -h
swapon --show
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
- Local realtime via BroadcastChannel (no hosted realtime service required)

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

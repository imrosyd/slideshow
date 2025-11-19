# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-11-19

### ⚠️ Breaking Changes

- **Main slideshow behavior changed**: The main page now uses the admin-controlled `dashboard.mp4` as the single primary slide. If `dashboard.mp4` is absent the main page will show the loading screen. This replaces the previous behavior that automatically composed slides from multiple image/video entries — update any remote clients that depended on the old behavior.
- **PDF.js worker served same-origin**: The app uses the installed `pdfjs-dist` worker (`pdf.worker.min.mjs`) served from `/public`. The `postinstall` script copies the matching worker into `public/`. This avoids CORS and API/worker version mismatch issues but requires that `npm install` is run during deployment.
- **Client-side Broadcast updates**: Admin-side video deletions now notify other same-origin tabs via a BroadcastChannel shim so main/remote pages refresh immediately. Server-side WebSocket broadcasting remains available for cross-device notifications.

### 🧭 Migration Notes

- Run `npm install` after pulling this release to ensure `pdf.worker.min.mjs` is copied into `public/` by the `postinstall` script.
- If you have integrations that query `/api/remote-images` to populate the main slideshow, update them to call `/api/check-dashboard` or adapt to the new dashboard-first workflow.
- If you host the worker on a CDN, set `NEXT_PUBLIC_PDFJS_WORKER_URL` to the desired URL (must match the installed `pdfjs-dist` version).

### 🐛 Fixes & Improvements

- PDF worker CORS / Version mismatch fixed by using same-origin worker.
- Main page dashboard behavior consolidated to rely on admin `dashboard.mp4`.
- Immediate UI refresh on admin video deletion via BroadcastChannel.

---

## [2.5.1] - 2025-11-19

### 🐛 Bugfixes & Stability

#### Fixed
- **PDF.js Worker CORS / Version mismatch**: The app no longer loads the worker from unpkg by default. The installed `pdfjs-dist` worker is copied into `public/` (via `postinstall`) and the client prefers a same-origin worker (`/pdf.worker.min.mjs`) to avoid CORS failures and API/worker version mismatches.
- **Main page dashboard behavior**: The main slideshow now uses the admin-controlled `dashboard.mp4` when available. If `dashboard.mp4` is not present, the main page shows the loading screen rather than displaying stale video content.
- **Immediate UI updates for deletions**: Deleting a video from the admin panel now notifies other same-origin tabs (BroadcastChannel shim) so the main/remote pages refresh immediately.

#### Changed
- Removed obsolete worker files from `public/` and kept the single matching `.mjs` worker.

## [2.5.0] - 2025-11-13

### 🚀 Multiple Deployment Options & Comprehensive Documentation

#### Added - Documentation & Deployment
- **Filesystem Storage Adapter**: Self-hosted file storage option
  - Auto-fallback between Filesystem and Supabase Storage
  - API routes for serving images and videos from filesystem
  - Support for range requests (video streaming)
  - Security measures (directory traversal prevention)
- **Deployment Flexibility**: Support for multiple hosting environments
  - Supabase only (cloud)
  - VPS/Server (self-hosted with PM2 + Nginx)
  - Docker container deployment
  - Shared hosting (cPanel with Node.js)
  - Local development options
- **Comprehensive README**: All-in-one installation guide
  - Quick comparison table for deployment options
  - Step-by-step guides for each environment
  - Configuration examples for all scenarios
  - Troubleshooting section
- **Storage Abstraction Layer** (`lib/storage-adapter.ts`)
  - Unified interface for all storage providers
  - Type-safe operations
  - Environment-based auto-detection
- **Custom Server** (`server.js`)
  - Support for cPanel Node.js App deployment
  - Graceful shutdown handling
  - Environment-aware configuration
- **Shared Hosting Guide**: Complete cPanel deployment documentation
  - MySQL database setup (alternative to PostgreSQL)
  - Node.js App configuration
  - .htaccess proxy setup
  - Limitations and workarounds explained

#### Changed
- **Documentation Consolidation**: Merged all guides into README.md
  - Removed separate documentation files (except CHANGELOG.md)
  - Single source of truth for installation and configuration
  - Improved navigation with table of contents
- **README.md**: Complete rewrite with deployment options
  - Added deployment comparison matrix (5 options)
  - Included code examples for all scenarios
  - Added maintenance commands and troubleshooting
  - Shared hosting section with cPanel guide
  - API documentation expanded
- **Version**: Updated to 2.5.0 in package.json
- **Dependencies**: Removed unused packages
  - Removed `dotenv` (Next.js handles .env automatically)
  - Removed `sharp` (not used in codebase)
  - Total: -8 packages

#### Removed - Documentation
- Obsolete documentation files (consolidated into README)
  - `DATABASE_SETUP.md`
  - `DATABASE_FALLBACK.id.md`
  - `DEPLOYMENT_NO_SUPABASE.md`
  - `QUICKSTART_NO_SUPABASE.md`
  - `VERSION_PLAN.md`
- Supabase documentation (consolidated into README)
  - `supabase/000_MIGRATION_ORDER.md`
  - `supabase/README.md`
  - Kept: `supabase/COMPLETE_MIGRATION.sql` (still useful)

#### Removed - Code Cleanup
- Disabled login approval feature (had bugs)
  - `components/LoginAttemptDialog.tsx`
  - `pages/api/auth/attempt.ts`
  - `pages/api/auth/respond-attempt.ts`
  - `pages/api/auth/check-attempts.ts`
  - `pages/api/auth/attempt-status.ts`
  - Cleaned code references in `pages/admin.tsx` and `pages/login.tsx`
  - Database table `login_attempts` kept for potential future use

#### Performance
- Reduced bundle size: Login page 2.52 kB → 2.33 kB (-190 bytes)
- Removed 1,106 lines of unused code
- Reduced total source size by ~500 KB
- Faster npm install (457 packages vs 465 packages)
- Cleaner codebase with no dead code

---

## [2.4.0] - 2025-11-13

### 🗄️ Prisma Integration & Database Flexibility

#### Added
- **Prisma Database Adapter**: Type-safe database operations
  - Automatic fallback from Prisma to Supabase
  - Full TypeScript support with Prisma Client
  - Database abstraction layer (`lib/db.ts`)
  - Support for any PostgreSQL database
- **Prisma Schema** (`prisma/schema.prisma`)
  - Mirror of Supabase database structure
  - Type-safe queries and mutations
  - Auto-generated TypeScript types
- **Database Abstraction Layer** (`lib/db.ts`)
  - Unified interface for database operations
  - Auto-detection: DATABASE_URL → Prisma, no URL → Supabase
  - Zero data loss migration path
  - Backward compatible with existing Supabase setup

#### Changed
- **API Endpoints**: Migrated to use database abstraction
  - `/api/admin/settings` - Settings operations
  - `/api/admin/metadata` - Image metadata
  - `/api/admin/images` - Image listing
  - `/api/settings` - Public settings
- **Session Manager** (`lib/session-manager.ts`)
  - Now uses database abstraction layer
  - Compatible with both Prisma and Supabase
- **Dependencies**: Added Prisma packages
  - `@prisma/client` v6.19.0
  - `prisma` v6.19.0

#### Fixed
- Type safety issues with null values in Prisma
- Session management type compatibility
- Settings value handling (null to empty string)

---

## [2.3.0] - 2025-11-12

### 🔐 Authentication & Session Management

#### Added
- **Remote Page Authentication**: Login required for remote control
  - Password-based authentication
  - Session persistence
  - Auto-redirect after login
- **Single Concurrent Session Control**: Enforce one device at a time
  - Automatic logout of other sessions on new login
  - Browser fingerprinting for session identification
  - Session heartbeat for keep-alive
  - Periodic session validation
- **Smart Session Management**: Browser-aware sessions
  - Multiple tabs on same browser allowed
  - Different browsers trigger session conflict
  - Session expiry after 24 hours of inactivity
- **Login Approval Flow** (disabled by default)
  - Approval dialog in active session
  - Timeout for pending approvals
  - Configurable via environment

#### Changed
- **Admin Integration**: Admin page now requires authentication
  - Consistent auth flow across all protected pages
  - Session-based access control
  - Improved security model
- **Remote UI**: Enhanced login flow
  - Better error messages
  - Redirect preservation
  - Session status indicators

#### Fixed
- Login loop issues on remote page
- Session query error handling
- Strict single device enforcement
- Browser_id column migration

#### Security
- Enforced auth validation on all protected endpoints
- Separate session IDs for admin and remote pages
- Session cleanup for expired entries

---

## [2.2.1] - 2025-11-11

### 📡 Real-time Updates

#### Added
- **Real-time Image Gallery Updates**: Auto-refresh without page reload
  - Supabase Realtime broadcast on image metadata changes
  - Client-side subscription for instant updates
  - Seamless UX for multi-user scenarios

#### Changed
- Gallery images now update automatically on admin changes
- No manual refresh needed when images are uploaded/modified

---

## [2.2.0] - 2025-11-09

### 🧹 Maintenance & Polish

#### Fixed
- **Video Resume Bug**: Fixed video restarting from beginning when closing image overlay
  - Video now properly resumes from pause position instead of restart
  - Added smart position tracking using refs
  - Separated slide change logic from pause/resume logic
  - Removed redundant effects causing conflicts

#### Changed
- **Tab Title**: Main page browser tab now displays "Slideshow" consistently
  - Added missing `<title>` tag to main slideshow content render
  - Ensures proper title display in all loading/error/empty states

#### Removed
- **Unused Files**: Cleaned up project directory
  - Removed debug scripts: `debug-images-remote.bat`, `test-video-debug.sh`
  - Removed build cache: `tsconfig.tsbuildinfo` (128KB)
  - Removed development log: `server.log` (400+ lines)
  - Total cleanup: ~530KB of unnecessary files

---

## [2.1.0] - 2025-11-09

### 🎬 Video Processing Enhancement

#### Changed
- **Merge to Video**: Reduced minimum required images from 2 to 1
  - Button now activates with just 1 gallery image
  - Enables single-image video conversion via merge feature
  - Dynamic dialog text adjusts for singular/plural ("1 image" vs "2 images")

#### Fixed
- Merge video button disabled state validation
- Error message now correctly states "Need at least 1 image"
- Dialog UI text properly handles singular and plural forms

---

## [2.0.0] - 2025-11-08

### 🎨 Major UI Overhaul - Glassmorphism Design

#### Added
- **Glassmorphism Image Preview**: Unified design language across all pages
  - Gradient background matching admin/login pages
  - 24px backdrop blur for premium glass effect
  - Rounded corners (24px border-radius)
  - Dual-layer shadows for depth
  - Semi-transparent container with border
- **Auto-hide Image Gallery**: Professional bottom gallery bar
  - Appears on mouse proximity (150px trigger zone)
  - Auto-hides after 3 seconds of inactivity
  - Grid layout with 160px cards
  - Premium badge with gradient
  - Smooth cubic-bezier transitions
- **Fullscreen Image Preview**: Click gallery images for detailed view
  - Glassmorphism card container
  - Click outside to close
  - Pause video during preview

#### Changed
- Image preview from fullscreen to glassmorphism card (95vw x 95vh)
- Gallery moved from right sidebar to bottom bar
- Removed close button from preview (click-to-close only)
- Enhanced gradient backgrounds across application

#### Fixed
- ESLint warning for useEffect dependencies
- Removed unused code and duplicate files
- Clean workspace (removed 28 documentation/test files, 4,636 lines)

#### Commits
- `aa1c3c5` - chore: Remove backup and old files
- `7b330f6` - feat: Update image preview overlay with glassmorphism design
- `9128dd4` - fix: Resolve ESLint warning for useEffect dependencies
- `df646d5` - chore: Clean up unused documentation and test files
- `9efeb2d` - feat: Remove close button from image preview overlay

---

## [1.9.0] - 2025-11-07

### 🖼️ Image Gallery & UI Polish

#### Added
- Interactive image gallery sidebar on main page
- Click images for fullscreen preview
- Filename badge overlay on hover
- Professional polish with enhanced shadows and gradients

#### Changed
- Gallery UI refined with better spacing and typography
- Improved glassmorphism effects
- Enhanced card animations and hover states

#### Fixed
- Orphaned database entries cleanup
- Supabase Realtime WebSocket fallback warnings

#### Commits
- `a6210b4` - feat: Enhanced gallery UI and fullscreen image preview
- `b68d76c` - refactor: Remove filename badge from image preview overlay
- `35b34a9` - style: Professional polish for image gallery UI
- `c5c8749` - feat: Move image gallery from sidebar to auto-hide bottom bar
- `7faeadc` - feat: Enhanced cleanup and image gallery
- `e06c9d3` - fix: Remove Supabase Realtime WebSocket fallback warnings

---

## [1.8.0] - 2025-11-06

### 🧹 Auto Cleanup & Maintenance

#### Added
- Automatic cleanup for corrupt videos
- Orphaned files detection and removal
- Cron job configuration for scheduled cleanup
- Cleanup automation documentation

#### Changed
- Improved cleanup API with comprehensive checks
- Better error handling for corrupted entries

#### Commits
- `962533d` - fix: Correct vercel.json syntax for cron configuration
- `664305c` - docs: Add quick reference guide for cleanup
- `9e70771` - docs: Add cleanup automation documentation and cron script
- `e9f0975` - feat: Add automatic cleanup for corrupt videos
- `078a0cc` - feat: Add cleanup script for corrupt video entries

---

## [1.7.0] - 2025-11-05

### 🎬 Video Processing Improvements

#### Added
- Merge video feature: combine multiple images into one video
- Progress indicator for video generation
- Debug logging for video processing

#### Fixed
- Placeholder images no longer appear in slideshow
- Matching encoding parameters between merge and generate
- Correct public URL usage for merged videos
- Metadata creation for merged videos

#### Commits
- `a70de65` - fix: Hide placeholder images from slideshow
- `9b21ee1` - feat: Add merge video progress indicator and debug logging
- `13f49e3` - Change slideshow to video-only mode
- `7f3ae6c` - Fix: Match merge-video encoding parameters with generate-video
- `79e43e8` - Fix: Use full public URL for merged video instead of filename
- `25f2178` - Add merge video feature - combine multiple images into one video

---

## [1.6.0] - 2025-11-04

### 🔧 Database & API Refactoring

#### Changed
- Simplified images API to use database as single source of truth
- Correct rendering of images vs videos in slideshow
- Fixed database column name from display_order to order_index

#### Fixed
- Merged videos now appear correctly in slideshow
- Video map properly populated
- Metadata handling for all video types

#### Commits
- `f254d12` - Fix: Correct database column name from display_order to order_index
- `0e9b026` - Refactor: Simplify images API to use database as single source of truth
- `e6f025c` - Fix: Ensure merged videos appear in slideshow by populating videoMap
- `876b3db` - Fix merged video display: hide placeholder image, show only video in slideshow
- `4271aa9` - Fix: Add metadata creation for merged videos with placeholder image

---

## [1.5.0] - 2025-11-03

### 🎮 UI Control System

#### Added
- Visible UI controls on main slideshow page
- Control buttons (Previous, Pause/Resume, Next)
- Mouse movement detection for auto-show/hide
- Distance threshold to prevent accidental triggers

#### Changed
- Controls centered in middle of screen
- Solid white buttons with black theme
- Transparent background for controls
- Removed slide name and duration from UI

#### Fixed
- Auto-show controls with distance threshold
- Prevented controls appearing unexpectedly
- Improved hover effects

#### Commits
- `ab784ec` - Update README to v1.5.0 - Document UI Control System
- `cf22e63` - Make control buttons solid white (non-transparent)
- `0ee2258` - Change controls to black theme and fix auto-show with distance threshold
- `3c667b1` - Fix auto-show controls and add hover effects
- `ee0bca0` - Fix controls: remove gray background and prevent auto-show
- `b750ed6` - Make controls background transparent
- `cd993bc` - Center controls overlay in the middle of screen
- `1008696` - Fix controls overlay appearing unexpectedly
- `89573d3` - Remove slide name and duration from UI controls
- `8492ccd` - Add visible UI controls to main slideshow page

---

## [1.4.0] - 2025-11-02

### 📡 Remote Control Integration

#### Added
- Real-time remote control via Supabase
- Separate channels for commands and status
- Heartbeat channel for reliable connection
- Initial status broadcast when slides load
- Remote control page for mobile/tablet devices

#### Fixed
- Remote control channel subscription issues
- Two-way communication between display and remote

#### Commits
- `8466ab9` - Add heartbeat channel for reliable remote connection
- `cb977a8` - Add initial status broadcast when slides load
- `7e04a36` - Update remote page to listen on both channels
- `9db924f` - Fix remote control: use separate channels for commands and status
- `4bf9589` - Fix remote control channel subscription issue
- `a3db03b` - Add remote control integration to main page

---

## [1.3.0] - 2025-11-01

### ⚡ Performance Optimization

#### Added
- Loading spinner for initial load and video transitions
- Simplified preload system
- Custom hooks for better code organization (webOS optimization)

#### Changed
- Clean rebuild with modular architecture
- Removed debug UI elements
- Improved video preloading logic

#### Fixed
- Video transition smoothness
- Memory management for preloading

#### Commits
- `11b3be5` - Restore original loading page design
- `f9bbf23` - Add loading spinner to initial load and video transitions
- `626bd5d` - Fix: Simplify preload system and remove debug UI
- `f0bfa97` - Add clean rebuild documentation
- `2aadaec` - CLEAN REBUILD: Refactor with custom hooks for webOS optimization

---

## [1.2.0] - 2025-10-31

### 💤 Display Management

#### Added
- Keep display awake during slideshow
- Periodic synthetic movement to prevent TV sleep
- Configurable slide durations

#### Changed
- Increased slide duration from 10s to 30s
- Better performance for webOS displays

#### Commits
- `f7f94dc` - feat: keep display awake during slideshow
- `5a3baf9` - feat: preload slides to avoid transition delay
- `92de23c` - Increase slide duration from 10s to 30s
- `6afcb6a` - Prevent TV sleep with periodic synthetic movement
- `72746bb` - Tingkatkan performa slideshow dan tambahkan favicon

---

## [1.1.0] - 2025-10-30

### 📤 Upload & Admin Improvements

#### Added
- Admin upload flow with Supabase backend
- Bilingual slideshow messaging (EN/ID/KO)
- Improved bulk upload handling
- Better UI feedback

#### Changed
- Adjusted upload API for larger payloads
- Enhanced Supabase usage patterns

#### Fixed
- Supabase config API types

#### Commits
- `632847c` - Add admin upload flow with Supabase-backed slideshow
- `028a464` - Adjust upload API to handle larger payloads
- `310a4f8` - Improve bulk uploads and add bilingual slideshow messaging
- `47f1828` - Improve Supabase usage and UI feedback
- `f3abdf1` - Fix Supabase config API types

---

## [1.0.0] - 2025-10-29

### 🎉 Initial Release

#### Added
- Basic slideshow functionality
- Image upload system
- Supabase integration
- Next.js foundation
- Timer functionality

#### Commits
- `8d849ca` - Initial commit
- `3f9ae9a` - Initial commit
- `11dde46` - Add files via upload
- `87ac8c5` - Add files via upload
- `2ea97cb` - Update timer

---

## Version Tags

Each version represents a stable, working state of the application:

- **v2.2.0** (d10d6ef): Video Resume Fix & Cleanup - Current
- **v2.1.0** (fdac949): Video Processing Enhancement
- **v2.0.0** (aa1c3c5): Glassmorphism UI & Gallery
- **v1.9.0** (e06c9d3): Image Gallery & Cleanup
- **v1.8.0** (e9f0975): Auto Cleanup System
- **v1.7.0** (25f2178): Video Merge Feature
- **v1.6.0** (0e9b026): Database Refactor
- **v1.5.0** (8492ccd): UI Controls
- **v1.4.0** (a3db03b): Remote Control
- **v1.3.0** (2aadaec): Performance Optimization
- **v1.2.0** (72746bb): Display Management
- **v1.1.0** (632847c): Upload System
- **v1.0.0** (8d849ca): Initial Release

---

**Note**: For creating releases on GitHub, each version tag should point to the last commit of that version as listed above.

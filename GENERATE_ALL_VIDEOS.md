## Generate All Videos Feature - Implementation Summary

### 🎯 What Was Implemented

This feature allows generating a single master video from **ALL** images in the admin panel, where each image displays for its **individual duration** configured in the database.

### 📋 Changes Made

#### 1. **API Endpoint** (`pages/api/admin/generate-video.ts`)
- **Added new interface `VideoImageData`** - Supports per-image durations
```typescript
type VideoImageData = {
  filename: string;
  durationSeconds: number;
}
```

- **Updated request handling** to support both formats:
  - **New format**: `videoData: VideoImageData[]` - Each image with its own duration
  - **Legacy format**: `filenames: string[], durationSeconds: number` - For backward compatibility

- **Duration calculation**:
  - New format: Uses exact duration for each image, total = sum of all durations
  - Legacy format: Distributes total duration evenly among images

- **Fixed database update** to use `totalDurationSeconds` instead of undefined variable

#### 2. **Hook** (`hooks/useImages.ts`)
- **Added type export**: `VideoImageData` for use in components
- **Updated `generateBatchVideo` function** to accept optional `videoData` parameter:
```typescript
async generateBatchVideo(
  filenames: string[],
  totalDurationSeconds?: number,
  videoData?: VideoImageData[]
)
```

#### 3. **Dialog Component** (`components/admin/GenerateAllVideoDialog.tsx`)
- **New component** that shows:
  - Count of all images
  - **Total duration** calculated from sum of individual durations (read-only)
  - **Detailed breakdown** of each image with its duration
  - **Progress indicator** during generation
  - List of all images with their configured durations

#### 4. **Admin Page** (`pages/admin.tsx`)
- **Added import** for `GenerateAllVideoDialog`
- **Added state**:
  - `showGenerateAllVideoDialog` - Control dialog visibility
  - `isGeneratingAllVideo` - Track generation state
  
- **Added handler** `handleGenerateAllVideo()`:
  - Automatically uses all images (no selection needed)
  - Creates `videoData` array with each image's `durationSeconds` from database
  - Calls API with new format
  - Shows success/error toast

- **Added button** in toolbar:
  - 🎥 "Generate All Videos"
  - Separate from bulk selection (always available if images exist)
  - Shows loading state during generation
  - Blue theme (distinguishes from batch video button)

### 🔄 How It Works

1. **User clicks "🎥 Generate All Videos" button** in admin toolbar
2. **Dialog opens** showing:
   - All images from database
   - Each image's configured duration
   - Total duration = sum of all individual durations
3. **User confirms** generation
4. **API processes**:
   - Downloads all images from Supabase Storage
   - For each image: uses FFmpeg with `-loop 1 -framerate 24 -t {individualDuration}`
   - Concatenates all videos with scale filter for h264 compatibility
   - Uploads result to `slideshow-videos` bucket
   - Updates database with video metadata for all images
5. **Main page**:
   - Detects video and plays instead of slideshow
   - Video loops infinitely (keeps LG TV webOS awake)
   - Each image displays for exactly its configured duration

### 📊 Example

**Database Images:**
```
image1.jpg - duration: 15 seconds
image2.jpg - duration: 25 seconds
image3.jpg - duration: 20 seconds
```

**Generated Video:**
- image1 displays for 15s
- image2 displays for 25s
- image3 displays for 20s
- **Total: 60 seconds**
- Video loops after 60s back to start

### ✅ Testing Checklist

- [ ] Open admin panel at `/admin`
- [ ] Verify "🎥 Generate All Videos" button visible
- [ ] Click button to open dialog
- [ ] Confirm dialog shows all images with correct durations
- [ ] Confirm calculated total = sum of all individual durations
- [ ] Click "Generate Master Video"
- [ ] Monitor server logs for FFmpeg progress
- [ ] Wait for "✅ Batch video generation complete!" message
- [ ] Refresh main page `/`
- [ ] Verify video plays (not slideshow)
- [ ] Verify each image displays for ~configured duration
- [ ] Verify video loops infinitely
- [ ] Check Supabase Storage for new video file in `slideshow-videos`
- [ ] Check database: all images should have `is_video=true`, `video_url=...`

### 🎬 Key Features

✅ **Per-image durations** - Each image uses its own display_duration from database
✅ **Automatic calculation** - Total duration auto-calculated from individual durations
✅ **Single video file** - All images combined into one seamless MP4
✅ **Backward compatible** - Legacy batch video generation still works
✅ **FFmpeg optimized** - Uses `-loop 1 -framerate 24 -t {duration}` for each image
✅ **Database integrated** - Updates all image records with video metadata
✅ **Error handling** - Proper error messages and logging

### 📁 Files Modified

1. `pages/api/admin/generate-video.ts` - API endpoint with per-image duration support
2. `hooks/useImages.ts` - Hook updated for new format
3. `components/admin/GenerateAllVideoDialog.tsx` - NEW dialog component
4. `pages/admin.tsx` - Added button, handler, and dialog rendering

### 🔗 Database Fields Used

- `image_durations.filename` - Image file name
- `image_durations.duration_ms` (converted to seconds) - Individual display duration
- `image_durations.is_video` - Updated to true after generation
- `image_durations.video_url` - Updated with Supabase Storage URL
- `image_durations.video_duration_seconds` - Updated with total video duration
- `image_durations.video_generated_at` - Timestamp of generation

### 🚀 Next Steps

1. Test the feature end-to-end
2. Monitor FFmpeg logs for any dimension issues
3. Verify video plays on LG TV webOS without issues
4. Check battery drain vs. slideshow approach
5. Optimize bitrate/quality if needed

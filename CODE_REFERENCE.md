# Code Implementation Reference

## Key Code Snippets

### 1. API Endpoint - Request Handling

```typescript
// From: pages/api/admin/generate-video.ts

interface VideoImageData {
  filename: string;
  durationSeconds: number;
}

interface GenerateVideoRequest {
  filenames?: string[];
  filename?: string;
  durationSeconds?: number;
  videoData?: VideoImageData[];
}

const { filenames, filename, durationSeconds, videoData } = req.body as GenerateVideoRequest;

// Handle new format: per-image durations
let imagesToProcess: string[] = [];
let imageDurations: Map<string, number> = new Map();
let totalDurationSeconds: number = 0;

if (videoData && Array.isArray(videoData) && videoData.length > 0) {
  // New format: per-image durations
  imagesToProcess = videoData.map(v => v.filename);
  videoData.forEach(v => {
    imageDurations.set(v.filename, v.durationSeconds);
    totalDurationSeconds += v.durationSeconds;
  });
  console.log(`[Video Gen] Using per-image durations for ${imagesToProcess.length} images, total: ${totalDurationSeconds}s`);
} else {
  // Legacy format: filenames array or single filename
  imagesToProcess = filenames && filenames.length > 0 ? filenames : (filename ? [filename] : []);
  
  if (imagesToProcess.length === 0 || !durationSeconds) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Legacy: distribute total duration evenly
  const durationPerImage = Math.max(1, Math.floor(durationSeconds! / imagesToProcess.length));
  const remainder = durationSeconds! - (durationPerImage * imagesToProcess.length);
  
  imagesToProcess.forEach((img, idx) => {
    const duration = idx === 0 ? durationPerImage + remainder : durationPerImage;
    imageDurations.set(img, duration);
  });
  totalDurationSeconds = durationSeconds!;
  console.log(`[Video Gen] Using legacy format: distributing ${totalDurationSeconds}s among ${imagesToProcess.length} images`);
}
```

### 2. FFmpeg Command Building

```typescript
// From: pages/api/admin/generate-video.ts

let ffmpegCmd = `ffmpeg`;

for (let i = 0; i < imagePaths.length; i++) {
  const imgFilename = imagesToProcess[i];
  const imageDuration = imageDurations.get(imgFilename) || 0;
  ffmpegCmd += ` -loop 1 -framerate 24 -t ${imageDuration} -i "${imagePaths[i]}"`;
  console.log(`[Video Gen] FFmpeg Input ${i + 1}: ${imageDuration}s`);
}

// Concat all videos and apply scale filter
const inputCount = imagePaths.length;
let filterComplex = '';

for (let i = 0; i < inputCount; i++) {
  filterComplex += `[${i}:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[v${i}];`;
}

filterComplex += inputCount === 1 
  ? `[v0]format=yuv420p[out]`
  : Array.from({ length: inputCount }, (_, i) => `[v${i}]`).join('') + `concat=n=${inputCount}:v=1:a=0,format=yuv420p[out]`;

ffmpegCmd += ` -filter_complex "${filterComplex}" -map "[out]" -c:v libx264 -pix_fmt yuv420p -b:v 1500k -r 24 "${tempVideoPath}" 2>&1`;

console.log(`[Video Gen] FFmpeg Command: ${ffmpegCmd.substring(0, 300)}...`);

const { stdout, stderr } = await execAsync(ffmpegCmd, {
  timeout: 600000,
  maxBuffer: 50 * 1024 * 1024,
});
```

### 3. Hook Update - generateBatchVideo

```typescript
// From: hooks/useImages.ts

export type VideoImageData = {
  filename: string;
  durationSeconds: number;
};

const generateBatchVideo = useCallback(
  async (
    filenames: string[],
    totalDurationSeconds?: number,
    videoData?: VideoImageData[]
  ) => {
    try {
      let requestBody: any;
      let logMessage: string;

      if (videoData && videoData.length > 0) {
        // New format: per-image durations
        const totalDuration = videoData.reduce((sum, v) => sum + v.durationSeconds, 0);
        logMessage = `[useImages] Generating batch video for ${videoData.length} image(s), total duration: ${totalDuration}s (per-image durations)`;
        requestBody = { videoData };
      } else if (filenames.length > 0 && typeof totalDurationSeconds === "number") {
        // Legacy format: total duration distributed evenly
        logMessage = `[useImages] Generating batch video for ${filenames.length} image(s), total duration: ${totalDurationSeconds}s`;
        requestBody = { filenames, durationSeconds: totalDurationSeconds };
      } else {
        throw new Error("Missing required parameters");
      }

      console.log(logMessage);

      const response = await fetch("/api/admin/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Token ${authToken}` }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Batch video generation failed");
      }

      const data = await response.json();
      console.log("[useImages] Batch video generation success:", data);

      // Update local state
      const imagesToUpdate = videoData ? videoData.map((v) => v.filename) : filenames;
      const videoDuration = videoData
        ? videoData.reduce((sum, v) => sum + v.durationSeconds, 0)
        : totalDurationSeconds || 0;

      setImagesState((prev) =>
        prev.map((img) =>
          imagesToUpdate.includes(img.name)
            ? {
                ...img,
                isVideo: true,
                videoUrl: data.videoUrl,
                videoGeneratedAt: new Date().toISOString(),
                videoDurationSeconds: videoDuration,
              }
            : img
        )
      );

      return data;
    } catch (error) {
      console.error("[useImages] Batch video generation failed:", error);
      throw error;
    }
  },
  [authToken, setImagesState]
);
```

### 4. Admin Handler - Generate All Videos

```typescript
// From: pages/admin.tsx

const handleGenerateAllVideo = useCallback(
  async () => {
    if (images.length === 0) {
      pushToast({
        variant: "error",
        description: "No images available",
      });
      return;
    }

    try {
      setIsGeneratingAllVideo(true);
      console.log(`[Admin] Generating master video for all ${images.length} images`);
      
      // Create videoData array with per-image durations
      const videoData = images.map((img) => ({
        filename: img.name,
        durationSeconds: img.durationSeconds || 0,
      }));

      const totalDuration = videoData.reduce((sum, v) => sum + v.durationSeconds, 0);
      console.log(`[Admin] Total duration: ${totalDuration}s`);
      
      // Call generateBatchVideo with new format (videoData)
      await generateBatchVideo([], undefined, videoData);
      
      console.log(`✅ Master video generated successfully`);
      pushToast({
        variant: "success",
        description: `Master video generated successfully for all ${images.length} image(s) (${totalDuration}s total)`,
      });

      setShowGenerateAllVideoDialog(false);
    } catch (error) {
      console.error("Master video generation error:", error);
      pushToast({
        variant: "error",
        description: `Failed to generate master video: ${error}`,
      });
    } finally {
      setIsGeneratingAllVideo(false);
    }
  },
  [images, generateBatchVideo, pushToast]
);
```

### 5. Dialog Component - Render Logic

```typescript
// From: components/admin/GenerateAllVideoDialog.tsx

const totalDuration = images.reduce((sum, img) => sum + (img.durationSeconds || 0), 0);
const imageCount = images.length;

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="mx-4 w-full max-w-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">🎬 Generate Master Video</h2>
        <p className="mt-2 text-sm text-white/60">
          Create a single video from all {imageCount} image{imageCount !== 1 ? "s" : ""} using their individual display durations
        </p>
      </div>

      {/* Summary Info */}
      <div className="mb-6 rounded-lg border border-blue-400/30 bg-blue-500/10 p-4">
        <div className="text-sm text-white/80">
          <p className="mb-1">
            <span className="font-semibold text-blue-300">{imageCount}</span>
            <span className="text-white/60"> images will be combined</span>
          </p>
          <p className="text-lg font-bold text-blue-300 mt-2">
            ⏱️ Total Duration: {totalDuration}s
          </p>
        </div>
      </div>

      {/* Images List */}
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold text-white/70 mb-3">Image Duration Breakdown</p>
        <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg bg-white/5 p-3">
          {images.map((img, idx) => (
            <div key={img.name} className="flex items-center justify-between rounded px-3 py-2 bg-white/5 border border-white/10">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">
                  {idx + 1}. {img.name}
                </p>
              </div>
              <span className="text-sm font-mono font-semibold text-blue-300 whitespace-nowrap">
                {img.durationSeconds || 0}s
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
```

### 6. Admin Page - Button in Toolbar

```typescript
// From: pages/admin.tsx

{/* Generate All Videos Button */}
<button
  onClick={() => setShowGenerateAllVideoDialog(true)}
  disabled={isGeneratingAllVideo || images.length === 0}
  className="flex items-center gap-2 rounded-lg border border-blue-400/40 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-2 text-sm font-medium text-blue-200 transition-all hover:border-blue-300/60 hover:from-blue-500/30 hover:to-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isGeneratingAllVideo ? (
    <>
      <div className="h-4 w-4 border-2 border-blue-200 border-t-transparent rounded-full animate-spin" />
      Generating...
    </>
  ) : (
    <>
      <span>🎥</span>
      Generate All Videos
    </>
  )}
</button>
```

---

## Testing Examples

### Test 1: Generate Video with 3 Images (Per-Image Durations)

```javascript
// Request
POST /api/admin/generate-video
{
  "videoData": [
    { "filename": "image1.jpg", "durationSeconds": 10 },
    { "filename": "image2.jpg", "durationSeconds": 15 },
    { "filename": "image3.jpg", "durationSeconds": 20 }
  ]
}

// Expected Result
- FFmpeg generates video with image1 for 10s, image2 for 15s, image3 for 20s
- Total video duration: 45 seconds
- Database updated for all 3 images with is_video=true, video_duration_seconds=45
```

### Test 2: Legacy Format (Backward Compatibility)

```javascript
// Request
POST /api/admin/generate-video
{
  "filenames": ["image1.jpg", "image2.jpg"],
  "durationSeconds": 60
}

// Expected Result
- FFmpeg generates video with each image for 30s
- Total video duration: 60 seconds
- Database updated with is_video=true, video_duration_seconds=60
```

---

## Logging Output Examples

### Successful Generation

```
[Video Gen] Using per-image durations for 3 images, total: 45s
[Video Gen] Starting video generation for 3 image(s) with total duration 45s
[Video Gen] Total images: 3
[Video Gen] Total video duration: 45s
[Video Gen] Image 1: image1.jpg (10s)
[Video Gen] Image 2: image2.jpg (15s)
[Video Gen] Image 3: image3.jpg (20s)
[Video Gen] Downloading 3 image(s)...
[Video Gen] Running FFmpeg with looped images...
[Video Gen] FFmpeg Input 1: 10s
[Video Gen] FFmpeg Input 2: 15s
[Video Gen] FFmpeg Input 3: 20s
[Video Gen] Video created: 2.45 MB
[Video Gen] Uploading video to storage: batch-video-image1-1730800142857.mp4
[Video Gen] Video uploaded: batch-video-image1-1730800142857.mp4
[Video Gen] Video URL: https://...
[Video Gen] Updating database for 3 image(s)...
[Video Gen] ✅ Batch video generation complete!
```

### Admin Console Logs

```
[Admin] Generating master video for all 3 images
[Admin] Total duration: 45s
✅ Master video generated successfully
```

---

## Debugging Tips

### Check if Per-Image Durations Are Being Used

Look for this log message:
```
[Video Gen] Using per-image durations for X images, total: Ys
```

### Check FFmpeg Command

Log shows first 300 characters:
```
[Video Gen] FFmpeg Command: ffmpeg -loop 1 -framerate 24 -t 10 -i "/tmp/..."...
```

### Monitor Duration Calculations

```
[Video Gen] Image 1: image1.jpg (10s)
[Video Gen] Image 2: image2.jpg (15s)
[Video Gen] Image 3: image3.jpg (20s)
```

### Verify Database Updates

Check that `image_durations` table has:
- `is_video: true` for all processed images
- `video_url: [same URL for all]`
- `video_duration_seconds: 45` (total)
- `video_generated_at: [current timestamp]`

---

**Reference Version:** 1.0
**Last Updated:** November 5, 2025

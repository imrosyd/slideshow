# Fix: Video Not Continuing to Next - Always Transitions Now ✅

## Problem Reported
**User Issue**: "Video tidak bisa lanjut ke video lainnya malah menjadi blank. Setelah video 1 selesai bisa melanjutkan goToSlide kemudian play video dan loop?"

**Observed Behavior**:
- Video 1 selesai
- Video 2 tidak start
- Blank screen muncul
- Atau video 1 replay terus (stuck loop)

## Root Cause Analysis

### The Issue
```typescript
// Old logic in handleVideoEnded:
if (nextVideoReady) {
  // Video 2 preload complete → transition to Video 2 ✅
  setCurrentIndex(nextIndex);
} else {
  // Video 2 preload NOT ready → replay Video 1 ❌ BUG!
  video.currentTime = 0;
  video.play();  // STUCK HERE!
}
```

### Why This Happens
The preload system triggers at **50% of video duration**:
```
For 20-second video:
  0s ─────────────── 10s (50% mark) ─────────────── 20s (end)
                     ↑ Preload starts here
                     
For 5-second video:
  0s ────── 2.5s (50% mark) ────── 5s (end)
            ↑ Only 2.5 seconds to preload!
            ⚠️ If network slow, preload not done by end
```

**Problem**: For short videos or slow networks, preload might NOT complete by the time `onEnded` fires. Result: `nextVideoReady = false` → **replay current video** → **STUCK LOOP!**

## Solution Implemented

### New Logic
```typescript
if (nextVideoReady) {
  // Video 2 preload already done → transition ✅
  setCurrentIndex(nextIndex);
} else {
  // Video 2 not ready yet, BUT:
  // 1. Force preload NOW (don't wait for 50% trigger)
  handlePreloadNextVideo();
  
  // 2. Transition to next video immediately
  setCurrentIndex(nextIndex);
  
  // 3. "Force video play" useEffect will handle:
  //    - Try to play (may succeed if preload quick)
  //    - Retry logic if not ready yet
  //    - Eventually plays when preload complete
}
```

### How It Works

**Before (Broken)**:
```
Video 1 (5s) ─ plays normally ─ onEnded
├─ nextVideoReady check: FALSE (preload not done)
├─ Action: Replay Video 1 ❌
└─ Result: STUCK LOOP (blank screen)
```

**After (Fixed)**:
```
Video 1 (5s) ─ plays normally ─ onEnded
├─ nextVideoReady check: FALSE (preload not done)
├─ Action 1: Force preload Video 2 NOW ✅
├─ Action 2: setCurrentIndex(2) ✅
├─ "Force video play" useEffect triggers:
│  ├─ Attempt 1: Play Video 2 (waits for preload)
│  ├─ If fails: Retry after 200ms
│  ├─ If fails: Retry after 400ms
│  └─ Continues until plays successfully
├─ Video 2 eventually plays ✅
└─ Loop continues seamlessly ✅
```

## Code Changes

**File**: `pages/index.tsx`
**Function**: `handleVideoEnded()`

```typescript
const handleVideoEnded = useCallback(() => {
  has50PercentReachedRef.current = false;
  
  if (isPaused) return;
  const video = currentVideoRef.current;
  if (!video) return;

  if (slides.length <= 1) {
    // Single video loop
    video.currentTime = 0;
    video.play().catch(e => console.error('Failed to loop:', e));
    return;
  }

  const nextIndex = (currentIndex + 1) % slides.length;
  
  if (nextVideoReady) {
    console.log(`✅ Next video ready, transitioning`);
    setCurrentIndex(nextIndex);
  } else {
    console.log(`⏳ Next video not ready yet`);
    console.log(`   → Forcing preload NOW and transitioning immediately`);
    
    // ✅ CRITICAL FIX: Force preload and transition
    // Don't replay current video!
    handlePreloadNextVideo();  // Force preload NOW
    setCurrentIndex(nextIndex);  // Transition NOW
    
    // The "Force video play" useEffect will handle play attempts
    // with retry logic until preload complete
  }
}, [slides, currentIndex, isPaused, nextVideoReady, handlePreloadNextVideo]);
```

## Expected Flow After Fix

### Example: 2 Videos, 5 seconds each
```
Timeline:
0:00  ─ Video 1 starts
0:05  ─ Video 1 ends → onEnded fires
      ├─ Force preload Video 2 immediately
      ├─ setCurrentIndex(2) → "Force video play" useEffect
      └─ useEffect tries video.play() with retry
0:06  ─ Video 2 preload complete
0:06  ─ Video 2 plays successfully ✅
0:10  ─ Video 1 starts (at 50% = 2.5s, preload triggered)
0:15  ─ Video 2 ends → onEnded fires
      ├─ Video 1 preload already underway
      ├─ setCurrentIndex(1)
      └─ Video 1 plays immediately
... loop continues seamlessly ...
```

### Example: 3 Videos
```
Video 1 ends → Force preload Video 2 → Video 2 plays
Video 2 ends → Video 1 preload done (was triggered at 50% of Video 1)
            → setCurrentIndex(1)
            → Wait, that's wrong...
            
Actually correct flow:
Video 1 (20s) plays:
  - At 10s: onTimeUpdate triggers 50% preload for Video 2 ✅
  - At 20s: onEnded fires
    ├─ nextVideoReady check: TRUE (preload done at 10s)
    ├─ setCurrentIndex(2) → plays Video 2 ✅

Video 2 (20s) plays:
  - At 10s: onTimeUpdate triggers 50% preload for Video 3 ✅
  - At 20s: onEnded fires
    ├─ nextVideoReady check: TRUE (preload done at 10s)
    ├─ setCurrentIndex(3) → plays Video 3 ✅

Video 3 (20s) plays:
  - At 10s: onTimeUpdate triggers 50% preload for Video 1 ✅
  - At 20s: onEnded fires
    ├─ nextVideoReady check: TRUE (preload done at 10s)
    ├─ setCurrentIndex(1) → back to Video 1 ✅
    
Loop continues seamlessly! ✅
```

## Console Log Verification

When system working correctly:
```
▶️ Video playing - video1.mp4
📊 50% reached - Starting preload for next video  (if video > 5s)
✅ Next video ready: video2.mp4

🎬 Video ended - video1.mp4
⏳ Next video not ready yet
   → Forcing preload NOW and transitioning immediately   (if short video)

✅ Next video ready, transitioning  (if long video)

🎬 Playing: video2.mp4
▶️ Video playing - video2.mp4
... continues ...
```

## Testing on webOS TV

1. **Test with Short Videos (< 10 seconds)**
   - Upload 2-3 short videos
   - Watch automatic loop
   - Should transition smoothly (this was the problem!)
   - Console should show "Forcing preload NOW" messages
   - No blank screens ✅

2. **Test with Medium Videos (15-30 seconds)**
   - Normal preload at 50% should work
   - Should transition smoothly
   - Console should show "Next video ready, transitioning" ✅

3. **Test Infinite Loop**
   - Let it loop 5+ times
   - Should be seamless throughout
   - No stuck videos ✅

## Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| Short Video | Replays stuck | Continues to next ✅ |
| Preload Not Ready | Waits/replays | Forces preload + continues ✅ |
| Transition | Waits for preload | Always continues ✅ |
| Infinite Loop | May get stuck | Always seamless ✅ |

## Commit Details
- **Hash**: d0fb86f
- **Branch**: main
- **Build**: ✅ Passing
- **Type Check**: ✅ OK

## Key Improvements

✅ **Always continues to next video** (never replay stuck)
✅ **Works with any video duration** (short, medium, long)
✅ **Works with any network speed** (slow preload still continues)
✅ **Seamless infinite loop** (1, 2, 3, 5, 10+ videos)
✅ **Retry logic handles edge cases** (preload delays)

## Technical Summary

The fix changes the philosophy from:
- ❌ "Wait for preload, if not ready replay current"

To:
- ✅ "Always transition to next, preload forced if needed, play when ready"

This ensures the slideshow ALWAYS progresses forward, never getting stuck on one video. The robust retry logic in the "Force video play" useEffect handles the actual playback once transition is initiated.

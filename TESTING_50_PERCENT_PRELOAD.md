# Testing Guide - Smart 50% Preload System

## Quick Start Testing

### 1. Local Development Test
```bash
cd /home/imron/project/slideshow
npm run dev
# Open http://localhost:3000 in browser
```

### 2. On webOS TV

#### Setup
1. Deploy to production (Vercel):
   ```bash
   git push origin main  # Already done ✅
   # Vercel auto-deploys
   ```

2. Access TV display:
   - Open production URL on TV browser
   - Or use TV remote to navigate to deployment

#### What to Watch For ✅

**Visual Indicators:**
- [ ] Video starts playing (no initial blank screen)
- [ ] After 50% duration, preload silently starts (invisible)
- [ ] Video continues to end without interruption
- [ ] Transition to next video is **instant** (no fade, no delay)
- [ ] No black/blank screen between videos
- [ ] Infinite loop works smoothly

**Console Log Verification** (Open DevTools - F12):
```
Expected sequence for 3-video slideshow:

🎬 [1/3] Playing: video1.mp4
⏱️ Video playing - video1.mp4
...
📊 50% reached (50%) - Starting preload for next video     ← CRITICAL
🔄 Preloading next video at 50%: video2.mp4              ← Should see immediately
✅ Next video ready: video2.mp4                            ← Should see before end
🎬 [1/3] Video ended - video1.mp4
✅ [2/3] Next video ready, transitioning: video2.mp4      ← Instant transition
🎬 [2/3] Playing: video2.mp4                              ← No gap!
... repeats for video 3 ...
🎬 [3/3] Playing: video3.mp4
📊 50% reached - Starting preload for next video
✅ Next video ready: video1.mp4                            ← Loop preload
🎬 [3/3] Video ended
✅ [1/3] Next video ready, transitioning: video1.mp4      ← Seamless loop!
```

## Specific Test Cases

### Test Case 1: Single Video
**Setup**: Upload 1 video only
**Expected**:
- [ ] Video plays smoothly
- [ ] At 50% mark, preload flag set (no effect on single video)
- [ ] Video ends and immediately loops back
- [ ] Console shows `🔁 [1/1] Single slide - looping video`
- [ ] No blank screens

### Test Case 2: Two Videos
**Setup**: Upload 2 videos, each ~20 seconds
**Expected**:
- [ ] Video 1 plays from 0-20s
- [ ] At 10s, Video 2 preload starts
- [ ] At 20s, Video 1 ends
- [ ] Transition to Video 2 is instant (should see "Ready" before "Ended")
- [ ] Video 2 plays from 0-20s
- [ ] At 10s, Video 1 preload starts
- [ ] At 20s, Video 2 ends
- [ ] Transition back to Video 1 is instant (infinite loop)
- [ ] Repeats forever

### Test Case 3: Many Videos (5+)
**Setup**: Upload 5+ videos with varying durations
**Expected**:
- [ ] Each video plays to completion
- [ ] Each has instant transition to next
- [ ] After last video, loop back to first instantly
- [ ] No skipping or blanks with any duration

### Test Case 4: Network Delay Simulation
**Setup**: Slow network (Dev Tools > Network > Slow 3G)
**Expected**:
- [ ] 50% preload gives enough time to download
- [ ] Transition still seamless
- [ ] May see slight delay in preload complete (normal)
- [ ] But still ready before current video ends

## Debugging Workflow

If you see blank screens, follow this checklist:

### Issue: Blank screen on transition
**Debug Steps**:
1. Check console for "50% reached" log
   - If missing: onTimeUpdate not firing
   - If present: preload mechanism working
   
2. Check console for "Next video ready" log
   - If missing before video ends: Network issue
   - If present: Transition should be seamless

3. Check video duration
   ```javascript
   // In console:
   const video = document.querySelector('video[data-type="main"]');
   console.log(`Duration: ${video.duration}s, Current: ${video.currentTime}s`);
   ```

### Issue: Console logs spam/missing
**Fix**: Refresh page, check DevTools panel is correct

### Issue: Loop doesn't work after last video
**Debug**:
```javascript
// In console, check currentIndex logic:
// Should cycle: 0 → 1 → 2 → ... → n → 0
// Using: (currentIndex + 1) % slides.length
```

## Performance Metrics to Check

Open DevTools > Performance tab during one full loop:

1. **Network**: 
   - Each video preload should show in Network tab
   - Preload at 50% mark = ample time

2. **Memory**:
   - One hidden video element
   - Should not accumulate (old preload cleaned up)

3. **CPU**:
   - No continuous animation overhead
   - Only processing at preload trigger and transition

## Success Criteria ✅

Your implementation is working if:

1. ✅ **No blank screens** between any videos
2. ✅ **Instant transitions** (no fade/delay)
3. ✅ **50% preload logs** appear in console
4. ✅ **Infinite loop** works for 1, 2, 5, 10+ videos
5. ✅ **Single video** loops smoothly
6. ✅ **Network delays** don't cause blanks (preload at 50% handles it)

## Rollback Trigger 🚨

If you experience:
- Persistent blank screens (worse than before)
- Videos not preloading
- Transitions freezing

Then:
```bash
git revert 90afd0d --no-edit
npm run build && npm run dev
# Test again to confirm fade transition works
```

## Performance Testing Checklist

- [ ] CPU usage normal during playback
- [ ] Memory not accumulating (no leak)
- [ ] Network shows preload requests at 50% mark
- [ ] No JavaScript errors in console
- [ ] All videos playable without gaps
- [ ] TV remains responsive during transitions

## Commit Details for Reference

**Current Implementation**: `90afd0d` (Smart 50% Preload)
**Previous Fallback**: `3644c76` (300ms Fade Transition)
**Before That**: `a810bfd` (Known working - basic fix)

If needed, you can compare branches:
```bash
git diff 3644c76..90afd0d -- pages/index.tsx
```

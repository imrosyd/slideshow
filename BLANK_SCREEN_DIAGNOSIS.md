# Blank Screen Diagnosis & Fix Guide

## 🔍 Step 1: Identifikasi Jenis Blank Screen

### A. **Blank saat transition antar video (0.5-2 detik)**
**Penyebab:** React re-render atau src update lag
**Solution:** Skip to Step 2

### B. **Blank permanen (video tidak muncul sama sekali)**
**Penyebab:** Video element tidak render atau video URL invalid
**Solution:** Skip to Step 3

### C. **Blank setelah beberapa video (video 1-2 OK, video 3+ blank)**
**Penyebab:** Memory leak, preload error, atau ref stale
**Solution:** Skip to Step 4

---

## 📋 Step 2: Fix Transition Blank Screen

### Issue: `key={currentSlide.videoUrl}` causing remount
❌ **Problem Code:**
```tsx
<video key={currentSlide.videoUrl} src={currentSlide.videoUrl} />
// React destroys old element → BLACK SCREEN → creates new element
```

✅ **Solution Applied:**
```tsx
<video src={currentSlide.videoUrl} />
// React updates src only, no remount, no black screen
```

**Verify:** Check if `key` prop is removed from video element
```bash
grep -n "key={currentSlide" pages/index.tsx
# Should return NOTHING (no results)
```

---

## 🎯 Step 3: Fix Video Not Appearing

### Issue: Video element not rendering or src invalid

**Check in Console:**
```
🎯 Rendering slide 3/5: video3.mp4
   hasSlide: true
   hasVideoUrl: true
   videoUrl: ✅
```

If `hasVideoUrl: false` → Video URL is missing

**Actions:**
1. Check Supabase storage - is video file there?
2. Check video URL format - must be full URL or accessible path
3. Test video URL directly in browser

**Quick Fix - Add Fallback:**
```tsx
src={currentSlide.videoUrl || currentSlide.url}
```

---

## 🔄 Step 4: Fix Multiple Videos Blank (Memory Leak)

### Issue: Preload video element not cleaned up properly

**Problem:** Hidden preload video element stays in DOM accumulating

**Current Code Check:**
```tsx
return () => {
  const elem = document.getElementById(preloadId);
  if (elem && elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }
};
```

**Ensure Cleanup:**
```tsx
// Add to window cleanup too
useEffect(() => {
  return () => {
    // Force cleanup on unmount
    const preload = document.getElementById("slideshow-preload-video");
    if (preload) preload.remove();
    const currentVideo = currentVideoRef.current;
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.src = '';
    }
  };
}, []);
```

---

## 🛠️ Immediate Actions

### 1. **Verify No `key` Prop:**
```bash
cd /home/imron/project/slideshow
grep -A 2 "<video" pages/index.tsx | head -20
```

Should show:
```tsx
<video
  ref={currentVideoRef}
  src={currentSlide.videoUrl}  // ✅ No key!
```

### 2. **Check Console Logs:**
Open TV console and look for:
```
✅ SLIDES VALIDATION (Total: X)
  [1/X] video1.mp4
     - videoUrl: ✅ https://...
```

If videoUrl shows `❌` → Problem is video URL

### 3. **Test Single Video First:**
- Upload 1 video only
- Does it play? Yes → System works
- Does it loop? Yes → Transition logic works
- Then add 2 videos, 3 videos, etc.

### 4. **Monitor Memory:**
- Open TV dev tools (if available)
- Watch for growing DOM elements
- Should only see 1 video element + 1 preload element

---

## 📊 Console Log Checklist

✅ **Should see:**
```
✅ Fetched X slides
📋 SLIDES VALIDATION (Total: X)
🎯 Rendering slide 1/X
▶️ Force play for slide 1
✅ Play success
```

❌ **Should NOT see:**
```
❌ Video error
MEDIA_ERR codes
No videoUrl
Memory warnings
```

---

## 🚨 Emergency Fix: Simplify Everything

If still blank after all steps, apply nuclear option:

```tsx
// Strip down to absolute minimum
<video
  ref={videoRef}
  src={videoUrl}
  autoPlay
  muted
  controls
  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
/>
```

Add `controls` temporarily to debug - can see if video actually loading.

---

## 📝 Report Template

When reporting blank screen, provide:

1. **How many videos?** 1 / 5 / 10+
2. **Which video blanks?** First / After 2-3 / All
3. **Blank duration?** 0.5s / 2s / Permanent
4. **Console log:** (paste full log)
5. **Video format:** MP4? WebM? Resolution? Size?
6. **Network speed:** Fast / Slow / Variable

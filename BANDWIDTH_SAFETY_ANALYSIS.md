# 🛡️ Bandwidth Safety Analysis

## 🎯 Current Status: **CONDITIONALLY SAFE**

Setup sekarang **aman JIKA:**
- ✅ TV menggunakan browser yang **respect cache headers**
- ✅ Tidak banyak visitor yang berbeda-beda
- ✅ Admin page tidak di-refresh terus-menerus

---

## 📊 Realistic Bandwidth Estimation

### Scenario 1: **Best Case (Single TV, Good Browser)**

**Setup:**
- 1 TV putar video 9 jam/hari
- Browser: Chrome/Firefox (cache bekerja baik)
- Video size: 50MB
- Admin access: 2-3x/hari

**Daily Usage:**
| Item | First Load | Cached | Total |
|------|-----------|--------|-------|
| Video (9h playback) | 50 MB | 0 MB | 50 MB |
| Image gallery API | 0.5 MB | 0 MB | 0.5 MB |
| Admin page access (3x) | 1.5 MB | 0 MB | 1.5 MB |
| Metadata API calls | 0.2 MB | 0 MB | 0.2 MB |
| **TOTAL** | | | **~52 MB/day** |

**Monthly:** 52 MB × 30 = **1.56 GB/month** ✅ **AMAN**

---

### Scenario 2: **Worst Case (Multiple Devices, Cache Issues)**

**Setup:**
- 3 different devices/browsers per day
- TV browser tidak cache dengan baik
- Video re-download setiap 2 jam
- Admin di-refresh sering (10x/hari)

**Daily Usage:**
| Item | Count | Size Each | Total |
|------|-------|-----------|-------|
| Video downloads | 5x | 50 MB | 250 MB |
| Image gallery (multiple devices) | 20x | 0.5 MB | 10 MB |
| Admin page loads | 10x | 0.5 MB | 5 MB |
| API calls | 100x | 0.02 MB | 2 MB |
| **TOTAL** | | | **~267 MB/day** |

**Monthly:** 267 MB × 30 = **8 GB/month** ❌ **OVER LIMIT**

---

## ⚠️ Critical Factors

### ✅ Yang Sudah Aman:
1. **Cache Headers Proper** - Browser akan cache video 7 hari
2. **CDN Cache** - Vercel Edge cache 30 hari
3. **No Auth Overhead** - Zero DB queries
4. **Optimized Payloads** - Select specific fields only

### ⚠️ Yang Masih Risiko:
1. **Browser Cache Respect** - Tergantung browser TV
2. **Multiple Visitors** - Setiap unique visitor = 1x download
3. **Video Updates** - Ganti video = cache invalidated
4. **Network Errors** - Retry = extra bandwidth

---

## 🔍 Vercel Egress Counting (IMPORTANT!)

### What Counts as Egress:
```
✅ Counts:
- Initial video download (50MB)
- Every unique visitor's first download
- CDN serving to new regions
- Failed requests that get retried
- API responses (even if small)

❌ Doesn't Count:
- Browser cache hits (status 304)
- Client-side JavaScript execution
- WebSocket connections (minimal)
```

### Key Insight:
**Vercel counts CDN → Browser transfer**, bukan Browser Cache.

Jadi:
- **1 TV yang sama**: Download 1x = 50MB egress ✅
- **3 TV berbeda**: Download 3x = 150MB egress ⚠️
- **TV clear cache**: Download lagi = +50MB egress ⚠️

---

## 📈 Projected Monthly Usage

### Conservative Estimate (Realistic):
| Scenario | Probability | Monthly Usage |
|----------|-------------|---------------|
| Best case (1 TV, cache works) | 40% | 1.5 GB |
| Normal case (1-2 devices, occasional refresh) | 40% | 3.0 GB |
| Worst case (multiple devices, cache issues) | 20% | 8.0 GB |

**Weighted Average:** 
(1.5 × 0.4) + (3.0 × 0.4) + (8.0 × 0.2) = **3.4 GB/month**

**Verdict:** ✅ **Likely under 5 GB** tapi tidak banyak margin

---

## 🛡️ Safety Measures (Recommended)

### 1. **Monitor Bandwidth Weekly** ⚠️ CRITICAL
```bash
# Check Vercel dashboard every week:
Vercel Dashboard → Analytics → Bandwidth

Target: < 150 MB/day average
Warning: > 200 MB/day
Critical: > 250 MB/day
```

### 2. **Set TV Browser to Never Clear Cache**
```javascript
// For webOS TV or similar, ensure:
- Set browser to never clear cache automatically
- Disable "Clear on exit"
- Keep localStorage persistent
```

### 3. **Limit Admin Access**
- Jangan buka admin page di banyak device
- 1-2 device admin saja
- Remote control: 1 device saja

### 4. **Monitor Video Updates**
Setiap ganti video = cache invalidated = TV download ulang.
- Try batch video updates (1x/week, bukan setiap hari)
- Update saat TV tidak jalan

---

## 🚨 Warning Signs

Watch for these indicators:

### 🟢 Safe (under 150 MB/day):
- TV plays smoothly without re-downloading
- Browser shows "304 Not Modified" in DevTools
- Daily bandwidth stable ~50-100 MB

### 🟡 Warning (150-200 MB/day):
- Occasional cache misses
- Multiple devices accessing
- Need to monitor closely

### 🔴 Critical (> 200 MB/day):
- TV re-downloading video frequently
- Many different visitors
- Cache not working properly
- **Action needed:** Investigate cache behavior

---

## 💡 Additional Optimizations (If Needed)

### If Bandwidth Still Too High:

**1. Reduce Video Quality:**
```bash
# Current: 1080p → ~50MB for 2-3 minutes
# Alternative: 720p → ~25MB (50% savings)
```

**2. Implement Rate Limiting:**
```typescript
// Limit unique IP downloads per day
// Already partially implemented in image/[name].ts
// Extend to video endpoint
```

**3. Use Cloudflare R2 (External CDN):**
- Move videos to Cloudflare R2
- Free egress bandwidth
- Vercel only proxies, R2 serves directly

**4. Compress Videos More:**
```bash
# Use better compression:
ffmpeg -i input.mp4 -c:v libx265 -crf 28 output.mp4
# Can reduce size by 30-40% with minimal quality loss
```

---

## 🎯 Recommendation: ADD MONITORING

Create a simple monitoring script:

### File: `scripts/check-bandwidth.sh`
```bash
#!/bin/bash
# Check daily bandwidth usage from Vercel

# Get today's usage (you need Vercel API token)
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/projects/$PROJECT_ID/analytics/bandwidth?since=$START&until=$END"

# Alert if > 200MB
if [ $USAGE -gt 200000000 ]; then
  echo "⚠️ WARNING: Bandwidth usage > 200MB today!"
  # Send notification (email, Telegram, etc)
fi
```

Run this daily via cron or GitHub Actions.

---

## ✅ Action Items (Priority Order)

### High Priority:
1. ✅ **Setup complete** (sudah selesai)
2. ⚠️ **Monitor Vercel bandwidth dashboard for 1 week**
3. ⚠️ **Test TV browser cache behavior** (most critical!)

### Medium Priority:
4. Set TV to never clear cache
5. Limit admin access to 1-2 devices
6. Document bandwidth usage pattern

### Low Priority (if needed):
7. Reduce video quality to 720p
8. Implement Cloudflare R2
9. Add server-side bandwidth monitoring

---

## 🎓 Testing TV Cache (CRITICAL)

### How to Test:
1. **Load video on TV first time**
   ```
   - Check Vercel Analytics: Should show ~50MB transfer
   ```

2. **Close and re-open TV browser** (same day)
   ```
   - Check DevTools Network tab (if possible on TV)
   - Look for: Status 304 (Not Modified)
   - Vercel Analytics: Should NOT increase by 50MB
   ```

3. **Next day, play video again**
   ```
   - Should still use cache (within 7 days)
   - Vercel Analytics: Should NOT increase by 50MB
   ```

**If TV re-downloads every time:**
- ❌ Cache not working
- Need to investigate TV browser settings
- May need different caching strategy

---

## 🏁 Final Verdict

### Is It Safe? **YES, BUT...**

✅ **Safe IF:**
- TV browser respects cache (7 days)
- Single TV device (not multiple)
- Admin access minimal
- Video updates infrequent

⚠️ **Risky IF:**
- Multiple different devices daily
- TV clears cache often
- Frequent video updates
- Cache headers not respected

### **Action:** 
**MONITOR for 1 week**, then adjust if needed.

Target: < 150 MB/day average  
Acceptable: < 200 MB/day  
Danger: > 250 MB/day

---

**Last Updated:** 2025-11-11  
**Status:** ✅ Setup complete, needs 1 week monitoring  
**Confidence:** 70% safe (pending browser cache verification)

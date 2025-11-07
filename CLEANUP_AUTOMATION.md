# Automatic Cleanup - Background Job Setup

## 🎯 Overview

Automatic cleanup system untuk menghapus video corrupt dari database. Mencegah error di slideshow dengan menghapus entries yang video file-nya tidak accessible.

---

## 🚀 Cara Pakai

### **Option 1: Manual (Via Admin Page)**

1. Login ke admin page: `http://your-domain.com/admin`
2. Klik tombol **"Cleanup Corrupt"** (merah) di header
3. Tunggu proses selesai (akan muncul notification)
4. Lihat hasil: berapa video yang dihapus vs di-keep

**Kapan Digunakan:**
- Setelah batch generate video
- Sebelum presentation/demo
- Jika melihat error di slideshow

---

### **Option 2: API Call (Via Script/Curl)**

```bash
# Manual trigger via curl
curl -X POST http://your-domain.com/api/admin/cleanup-corrupt-videos

# Via script
node -e "
  fetch('http://your-domain.com/api/admin/cleanup-corrupt-videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => console.log('Cleanup result:', data))
  .catch(err => console.error('Error:', err));
"
```

**Response Format:**
```json
{
  "checked": 10,
  "deleted": 3,
  "kept": 7,
  "deletedEntries": ["corrupt1.jpg", "corrupt2.jpg", "corrupt3.jpg"],
  "keptEntries": ["valid1.jpg", "valid2.jpg", ...]
}
```

---

### **Option 3: Cron Job (Automatic/Scheduled)**

#### **A. Linux Cron (Recommended for Server)**

1. **Buat Script Cleanup:**
   ```bash
   nano /home/imron/project/slideshow/cron-cleanup.sh
   ```

2. **Isi Script:**
   ```bash
   #!/bin/bash
   # Automatic cleanup for corrupt videos
   
   # Configuration
   API_URL="http://localhost:3000/api/admin/cleanup-corrupt-videos"
   LOG_FILE="/home/imron/project/slideshow/logs/cleanup.log"
   
   # Create logs directory if not exists
   mkdir -p "$(dirname "$LOG_FILE")"
   
   # Run cleanup
   echo "[$(date)] Starting cleanup..." >> "$LOG_FILE"
   
   RESULT=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json")
   
   echo "[$(date)] Result: $RESULT" >> "$LOG_FILE"
   echo "---" >> "$LOG_FILE"
   ```

3. **Buat Executable:**
   ```bash
   chmod +x /home/imron/project/slideshow/cron-cleanup.sh
   ```

4. **Setup Cron Job:**
   ```bash
   crontab -e
   ```

5. **Tambahkan Schedule:**
   ```cron
   # Run cleanup setiap hari jam 3 pagi
   0 3 * * * /home/imron/project/slideshow/cron-cleanup.sh
   
   # Run cleanup setiap 6 jam
   0 */6 * * * /home/imron/project/slideshow/cron-cleanup.sh
   
   # Run cleanup setiap Minggu jam 2 pagi
   0 2 * * 0 /home/imron/project/slideshow/cron-cleanup.sh
   ```

#### **B. PM2 Cron (If using PM2)**

1. **Install PM2 (jika belum):**
   ```bash
   npm install -g pm2
   ```

2. **Buat Cleanup Script:**
   ```javascript
   // cleanup-cron.js
   const https = require('https');
   
   const API_URL = 'http://localhost:3000/api/admin/cleanup-corrupt-videos';
   
   console.log(`[${new Date().toISOString()}] Starting cleanup...`);
   
   const req = https.request(API_URL, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' }
   }, (res) => {
     let data = '';
     res.on('data', chunk => data += chunk);
     res.on('end', () => {
       console.log(`[${new Date().toISOString()}] Result:`, data);
     });
   });
   
   req.on('error', (error) => {
     console.error(`[${new Date().toISOString()}] Error:`, error);
   });
   
   req.end();
   ```

3. **Setup PM2 Cron:**
   ```bash
   # Run setiap hari jam 3 pagi
   pm2 start cleanup-cron.js --cron "0 3 * * *" --no-autorestart
   
   # Save PM2 config
   pm2 save
   pm2 startup
   ```

#### **C. Vercel Cron (If deployed on Vercel)**

1. **Tambahkan ke `vercel.json`:**
   ```json
   {
     "crons": [{
       "path": "/api/admin/cleanup-corrupt-videos",
       "schedule": "0 3 * * *"
     }]
   }
   ```

2. **Deploy ulang:**
   ```bash
   vercel --prod
   ```

---

## 📋 Cron Schedule Examples

```cron
# Setiap hari jam 3 pagi
0 3 * * *

# Setiap 6 jam
0 */6 * * *

# Setiap Senin jam 2 pagi
0 2 * * 1

# Setiap jam
0 * * * *

# Setiap 30 menit
*/30 * * * *
```

**Format:** `minute hour day month weekday`
- minute: 0-59
- hour: 0-23
- day: 1-31
- month: 1-12
- weekday: 0-7 (0 dan 7 = Minggu)

---

## 🔍 Monitoring & Logs

### **Check Cleanup Logs:**
```bash
# View log file
tail -f /home/imron/project/slideshow/logs/cleanup.log

# View last 50 lines
tail -50 /home/imron/project/slideshow/logs/cleanup.log

# View today's cleanup
grep "$(date +%Y-%m-%d)" /home/imron/project/slideshow/logs/cleanup.log
```

### **Check Cron Status:**
```bash
# List cron jobs
crontab -l

# Check cron logs
grep CRON /var/log/syslog

# PM2 logs
pm2 logs cleanup-cron
```

---

## ⚙️ Advanced Configuration

### **Timeout Configuration**

Edit `pages/api/admin/cleanup-corrupt-videos.ts` jika perlu adjust timeout:

```typescript
// Set timeout to avoid hanging (default: 5000ms = 5 detik)
request.setTimeout(5000, () => {
  request.destroy();
  resolve(false);
});
```

### **Notification Integration**

Tambahkan webhook notification (Slack, Discord, Email, dll):

```bash
#!/bin/bash
# cron-cleanup-with-notification.sh

API_URL="http://localhost:3000/api/admin/cleanup-corrupt-videos"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

RESULT=$(curl -s -X POST "$API_URL")

# Send to Slack
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"Cleanup completed: $RESULT\"}"
```

---

## 🛡️ Security Notes

1. **Production:** Tambahkan authentication untuk API endpoint
2. **Rate Limiting:** Prevent abuse dengan rate limiter
3. **Logging:** Monitor cleanup activity untuk audit trail

---

## 📊 What Gets Cleaned

✅ **Deleted:**
- Video entries dengan file yang tidak accessible (404)
- Video entries dengan URL corrupt/invalid
- Placeholder images untuk video yang gagal generate

✅ **Kept:**
- Video entries dengan file yang accessible (HTTP 200)
- Valid merged videos
- Successfully generated videos

---

## 🎯 Best Practices

1. **Run cleanup setelah batch operations**
2. **Schedule di off-peak hours** (malam hari)
3. **Monitor logs regularly**
4. **Keep backup before first run**
5. **Test manual dulu** sebelum setup cron

---

## 🐛 Troubleshooting

**Problem:** Cron tidak jalan
```bash
# Check cron service
sudo service cron status

# Restart cron
sudo service cron restart

# Check cron logs
grep CRON /var/log/syslog
```

**Problem:** API timeout
- Increase timeout di cleanup API
- Check network connectivity
- Verify Next.js server running

**Problem:** Permission denied
```bash
chmod +x /path/to/cleanup-script.sh
```

---

## ✅ Summary

Sekarang Anda punya **3 cara** menjalankan cleanup:
1. ✅ **Manual** - Via admin page button
2. ✅ **API Call** - Via curl/script
3. ✅ **Cron Job** - Automatic/scheduled

Pilih yang paling sesuai dengan kebutuhan Anda! 🚀

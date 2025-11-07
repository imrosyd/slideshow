# 🚀 Cleanup Corrupt Videos - Quick Reference

## ⚡ Quick Actions

### **Manual Cleanup (Recommended untuk Testing)**
1. Buka admin page: http://localhost:3000/admin
2. Klik tombol **"Cleanup Corrupt"** (merah)
3. Lihat notification hasil cleanup

### **Via Terminal (One-time)**
```bash
# Local
curl -X POST http://localhost:3000/api/admin/cleanup-corrupt-videos

# Production
curl -X POST https://your-domain.com/api/admin/cleanup-corrupt-videos
```

### **Setup Cron Job (Automatic Daily)**
```bash
# 1. Edit crontab
crontab -e

# 2. Tambahkan line ini (run setiap hari jam 3 pagi):
0 3 * * * /home/imron/project/slideshow/cron-cleanup.sh

# 3. Save dan exit
# Done! ✅
```

## 📊 Check Results

### **View Logs**
```bash
# Real-time log
tail -f /home/imron/project/slideshow/logs/cleanup.log

# Last 20 lines
tail -20 /home/imron/project/slideshow/logs/cleanup.log
```

### **Verify Cron Running**
```bash
# List cron jobs
crontab -l

# Check cron service
sudo service cron status
```

## 🎯 Common Schedules

```bash
# Setiap hari jam 3 pagi
0 3 * * *

# Setiap 6 jam
0 */6 * * *

# Setiap Senin jam 2 pagi  
0 2 * * 1

# Setiap jam
0 * * * *
```

## 🐛 Troubleshooting

**Cron tidak jalan?**
```bash
sudo service cron restart
```

**API tidak response?**
```bash
# Check if Next.js running
ps aux | grep next

# Restart Next.js if needed
pm2 restart slideshow
```

**Permission denied?**
```bash
chmod +x /home/imron/project/slideshow/cron-cleanup.sh
```

## ✅ Done!

Untuk detail lengkap, baca: **CLEANUP_AUTOMATION.md**

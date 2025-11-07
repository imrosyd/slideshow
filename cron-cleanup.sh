#!/bin/bash
# Automatic cleanup for corrupt videos
# Run this script via cron to automatically clean corrupt video entries

# Configuration
API_URL="${CLEANUP_API_URL:-http://localhost:3000/api/admin/cleanup-corrupt-videos}"
LOG_DIR="/home/imron/project/slideshow/logs"
LOG_FILE="$LOG_DIR/cleanup.log"
MAX_LOG_SIZE=10485760  # 10MB

# Create logs directory if not exists
mkdir -p "$LOG_DIR"

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d_%H%M%S).bak"
    echo "Log rotated on $(date)" > "$LOG_FILE"
fi

# Log start
echo "========================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting cleanup..." >> "$LOG_FILE"

# Run cleanup and capture result
RESULT=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    --max-time 60 \
    --connect-timeout 10)

EXIT_CODE=$?

# Log result
if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS" >> "$LOG_FILE"
    echo "Result: $RESULT" >> "$LOG_FILE"
    
    # Parse JSON and log summary (requires jq - optional)
    if command -v jq &> /dev/null; then
        DELETED=$(echo "$RESULT" | jq -r '.deleted // 0')
        KEPT=$(echo "$RESULT" | jq -r '.kept // 0')
        echo "Summary: Deleted $DELETED, Kept $KEPT" >> "$LOG_FILE"
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAILED (exit code: $EXIT_CODE)" >> "$LOG_FILE"
    echo "Error: curl command failed" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"

# Exit with curl's exit code
exit $EXIT_CODE

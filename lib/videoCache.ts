/**
 * Video Caching System using IndexedDB
 * Stores video blobs locally for faster playback on subsequent views
 */

const DB_NAME = 'slideshow-video-cache';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

interface CachedVideo {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

interface CacheStats {
  totalSize: number;
  videoCount: number;
  videos: { url: string; size: number; timestamp: number }[];
}

/**
 * Initialize IndexedDB database
 */
export async function initVideoCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('size', 'size', { unique: false });
        console.log('✅ IndexedDB initialized for video cache');
      }
    };
  });
}

/**
 * Cache a video blob by URL
 */
export async function cacheVideo(url: string, blob: Blob): Promise<void> {
  try {
    const db = await initVideoCache();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cached: CachedVideo = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cached);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`💾 Cached video: ${url.split('/').pop()} (${formatBytes(blob.size)})`);
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to cache video:', error);
  }
}

/**
 * Get cached video blob by URL
 */
export async function getCachedVideo(url: string): Promise<Blob | null> {
  try {
    const db = await initVideoCache();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          console.log(`✅ Using cached video: ${url.split('/').pop()}`);
          resolve(request.result.blob);
        } else {
          console.log(`⏭️ Cache miss: ${url.split('/').pop()}`);
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('Failed to retrieve cached video:', error);
    return null;
  }
}

/**
 * Create object URL from cache or fetch
 */
export async function getVideoUrl(url: string): Promise<string> {
  // Try cache first
  const cached = await getCachedVideo(url);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  // Not in cache - return original URL
  return url;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await initVideoCache();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const videos: CachedVideo[] = request.result;
        const totalSize = videos.reduce((sum, v) => sum + v.size, 0);
        const stats: CacheStats = {
          totalSize,
          videoCount: videos.length,
          videos: videos.map(v => ({
            url: v.url,
            size: v.size,
            timestamp: v.timestamp,
          })),
        };
        console.log(`📊 Cache Stats: ${videos.length} videos, ${formatBytes(totalSize)}`);
        resolve(stats);
      };
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { totalSize: 0, videoCount: 0, videos: [] };
  }
}

/**
 * Clear all cached videos
 */
export async function clearVideoCache(): Promise<void> {
  try {
    const db = await initVideoCache();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('🗑️ Video cache cleared');
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Delete specific cached video
 */
export async function deleteCachedVideo(url: string): Promise<void> {
  try {
    const db = await initVideoCache();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(url);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`❌ Deleted cached video: ${url.split('/').pop()}`);
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to delete cached video:', error);
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

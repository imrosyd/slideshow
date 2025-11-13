/**
 * Storage Abstraction Layer
 * 
 * Automatic fallback between different storage providers:
 * 1. Filesystem (local)
 * 2. S3-compatible (Cloudflare R2, AWS S3, etc)
 * 3. Supabase Storage (original)
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Storage adapter interface
export interface StorageAdapter {
  uploadImage(filename: string, buffer: Buffer): Promise<string>;
  uploadVideo(filename: string, buffer: Buffer): Promise<string>;
  deleteImage(filename: string): Promise<void>;
  deleteVideo(filename: string): Promise<void>;
  listImages(): Promise<string[]>;
  listVideos(): Promise<string[]>;
  getImageUrl(filename: string): string;
  getVideoUrl(filename: string): string;
  getAdapterType(): 'filesystem' | 's3' | 'supabase';
}

// Filesystem Storage Adapter
class FilesystemStorageAdapter implements StorageAdapter {
  private storageDir: string;
  private imagesDir: string;
  private videosDir: string;
  private publicUrl: string;

  constructor() {
    this.storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
    this.imagesDir = path.join(this.storageDir, 'images');
    this.videosDir = path.join(this.storageDir, 'videos');
    this.publicUrl = process.env.STORAGE_PUBLIC_URL || '/api/storage';

    // Ensure directories exist
    [this.imagesDir, this.videosDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  getAdapterType(): 'filesystem' | 's3' | 'supabase' {
    return 'filesystem';
  }

  async uploadImage(filename: string, buffer: Buffer): Promise<string> {
    const filepath = path.join(this.imagesDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    return `${this.publicUrl}/images/${filename}`;
  }

  async uploadVideo(filename: string, buffer: Buffer): Promise<string> {
    const filepath = path.join(this.videosDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    return `${this.publicUrl}/videos/${filename}`;
  }

  async deleteImage(filename: string): Promise<void> {
    const filepath = path.join(this.imagesDir, filename);
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  }

  async deleteVideo(filename: string): Promise<void> {
    const filepath = path.join(this.videosDir, filename);
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  }

  async listImages(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.imagesDir);
      return files.filter(f => !f.startsWith('.'));
    } catch (error) {
      console.error('[Storage] Error listing images:', error);
      return [];
    }
  }

  async listVideos(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.videosDir);
      return files.filter(f => !f.startsWith('.'));
    } catch (error) {
      console.error('[Storage] Error listing videos:', error);
      return [];
    }
  }

  getImageUrl(filename: string): string {
    return `${this.publicUrl}/images/${filename}`;
  }

  getVideoUrl(filename: string): string {
    return `${this.publicUrl}/videos/${filename}`;
  }

  // Helper methods for direct file access (server-side only)
  getImagePath(filename: string): string {
    return path.join(this.imagesDir, filename);
  }

  getVideoPath(filename: string): string {
    return path.join(this.videosDir, filename);
  }
}

// Supabase Storage Adapter (original)
class SupabaseStorageAdapter implements StorageAdapter {
  private supabase: any;
  private bucket: string;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'slideshow-images';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getAdapterType(): 'filesystem' | 's3' | 'supabase' {
    return 'supabase';
  }

  async uploadImage(filename: string, buffer: Buffer): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }

  async uploadVideo(filename: string, buffer: Buffer): Promise<string> {
    const videoBucket = 'slideshow-videos';
    const { data, error } = await this.supabase.storage
      .from(videoBucket)
      .upload(filename, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from(videoBucket)
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }

  async deleteImage(filename: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([filename]);

    if (error) throw error;
  }

  async deleteVideo(filename: string): Promise<void> {
    const videoBucket = 'slideshow-videos';
    const { error } = await this.supabase.storage
      .from(videoBucket)
      .remove([filename]);

    if (error) throw error;
  }

  async listImages(): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list('', { limit: 1000 });

    if (error) throw error;

    return data?.map((file: any) => file.name) || [];
  }

  async listVideos(): Promise<string[]> {
    const videoBucket = 'slideshow-videos';
    const { data, error } = await this.supabase.storage
      .from(videoBucket)
      .list('', { limit: 1000 });

    if (error) throw error;

    return data?.map((file: any) => file.name) || [];
  }

  getImageUrl(filename: string): string {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filename);

    return data.publicUrl;
  }

  getVideoUrl(filename: string): string {
    const videoBucket = 'slideshow-videos';
    const { data } = this.supabase.storage
      .from(videoBucket)
      .getPublicUrl(filename);

    return data.publicUrl;
  }
}

// Auto-detect and create appropriate adapter
function createStorageAdapter(): StorageAdapter {
  // Check if filesystem storage is enabled
  if (process.env.USE_FILESYSTEM_STORAGE === 'true') {
    console.log('[Storage] Using Filesystem adapter');
    return new FilesystemStorageAdapter();
  }

  // Try Supabase (default for backward compatibility)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('[Storage] Using Supabase adapter');
    return new SupabaseStorageAdapter();
  }

  // Fallback to filesystem if no Supabase credentials
  console.log('[Storage] No Supabase credentials, falling back to Filesystem adapter');
  return new FilesystemStorageAdapter();
}

// Export singleton instance
export const storage: StorageAdapter = createStorageAdapter();

// Export classes for testing or custom instantiation
export { FilesystemStorageAdapter, SupabaseStorageAdapter };

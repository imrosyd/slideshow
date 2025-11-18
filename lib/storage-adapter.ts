/**
 * Storage Abstraction Layer
 * 
 * This file provides a consistent interface for file storage operations,
 * using the local filesystem as the storage provider.
 */

import fs from 'fs';
import path from 'path';

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
  getAdapterType(): 'filesystem';
  getImagePath(filename: string): string;
  getVideoPath(filename: string): string;
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

  getAdapterType(): 'filesystem' {
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

// Export singleton instance
export const storage: StorageAdapter = new FilesystemStorageAdapter();

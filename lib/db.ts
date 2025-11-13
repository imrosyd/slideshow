/**
 * Database Abstraction Layer with Auto-Fallback
 * 
 * Priority:
 * 1. Try Prisma (if DATABASE_URL is configured)
 * 2. Fallback to Supabase
 * 
 * Usage: import { db } from './lib/db'
 */

import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Database adapter types
export type ImageDuration = {
  id: number;
  filename: string;
  duration_ms: number;
  caption: string | null;
  order_index: number;
  hidden: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  video_url?: string | null;
  video_duration_ms?: number | null;
  video_status?: string | null;
  is_video?: boolean;
};

export type SlideshowSetting = {
  id: number;
  key: string;
  value: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type ActiveSession = {
  id: string;
  user_id: string;
  email: string;
  created_at: string | Date;
  last_seen: string | Date;
  page: "admin" | "remote";
  session_id: string;
  browser_id: string | null;
};

export type LoginAttempt = {
  id: string;
  user_id: string;
  email: string;
  browser_id: string;
  browser_info: string | null;
  status: string;
  created_at: string | Date;
  responded_at: string | Date | null;
  expires_at: string | Date;
};

// Database adapter interface
export interface DatabaseAdapter {
  // Image Durations
  getImageDurations(filters?: { hidden?: boolean; is_video?: boolean }): Promise<ImageDuration[]>;
  getImageDurationByFilename(filename: string): Promise<ImageDuration | null>;
  upsertImageDuration(data: Partial<ImageDuration> & { filename: string }): Promise<ImageDuration>;
  upsertImageDurations(data: (Partial<ImageDuration> & { filename: string })[]): Promise<number>;
  updateImageDuration(filename: string, data: Partial<ImageDuration>): Promise<ImageDuration>;
  deleteImageDuration(filename: string): Promise<void>;
  
  // Settings
  getSettings(): Promise<SlideshowSetting[]>;
  getSettingByKey(key: string): Promise<SlideshowSetting | null>;
  upsertSetting(key: string, value: string): Promise<SlideshowSetting>;
  
  // Active Sessions
  getAllActiveSessions(): Promise<ActiveSession[]>;
  getActiveSessionByUserId(userId: string): Promise<ActiveSession | null>;
  getActiveSessionBySessionId(sessionId: string): Promise<ActiveSession | null>;
  createActiveSession(data: Omit<ActiveSession, 'id' | 'created_at'>): Promise<ActiveSession>;
  updateActiveSession(id: string, data: Partial<ActiveSession>): Promise<void>;
  deleteActiveSession(userId: string): Promise<void>;
  deleteAllActiveSessions(): Promise<void>;
  deleteStaleActiveSessions(cutoffDate: Date): Promise<void>;
  
  // Login Attempts (optional, currently disabled)
  getLoginAttempts(filters?: { user_id?: string; status?: string }): Promise<LoginAttempt[]>;
  createLoginAttempt(data: Omit<LoginAttempt, 'id' | 'created_at' | 'responded_at'>): Promise<LoginAttempt>;
  updateLoginAttempt(id: string, data: Partial<LoginAttempt>): Promise<void>;
  
  // Utility
  getAdapterType(): 'prisma' | 'supabase';
}

// Prisma Adapter
class PrismaAdapter implements DatabaseAdapter {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getAdapterType(): 'prisma' | 'supabase' {
    return 'prisma';
  }

  // Image Durations
  async getImageDurations(filters?: { hidden?: boolean; is_video?: boolean }): Promise<ImageDuration[]> {
    const where: any = {};
    if (filters?.hidden !== undefined) where.hidden = filters.hidden;
    if (filters?.is_video !== undefined) where.is_video = filters.is_video;
    
    const results = await this.prisma.imageDuration.findMany({
      where,
      orderBy: { order_index: 'asc' },
    });
    
    return results.map(r => ({
      ...r,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    }));
  }

  async getImageDurationByFilename(filename: string): Promise<ImageDuration | null> {
    const result = await this.prisma.imageDuration.findUnique({
      where: { filename },
    });
    
    if (!result) return null;
    
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async upsertImageDuration(data: Partial<ImageDuration> & { filename: string }): Promise<ImageDuration> {
    // Filter out null values for Prisma
    const updateData: any = {};
    if (data.duration_ms !== undefined && data.duration_ms !== null) updateData.duration_ms = data.duration_ms;
    if (data.caption !== undefined) updateData.caption = data.caption ?? undefined;
    if (data.order_index !== undefined && data.order_index !== null) updateData.order_index = data.order_index;
    if (data.hidden !== undefined && data.hidden !== null) updateData.hidden = data.hidden;
    if (data.video_url !== undefined) updateData.video_url = data.video_url ?? undefined;
    if (data.video_duration_ms !== undefined) updateData.video_duration_ms = data.video_duration_ms ?? undefined;
    if (data.video_status !== undefined) updateData.video_status = data.video_status ?? undefined;
    if (data.is_video !== undefined && data.is_video !== null) updateData.is_video = data.is_video;

    const result = await this.prisma.imageDuration.upsert({
      where: { filename: data.filename },
      update: updateData,
      create: {
        filename: data.filename,
        duration_ms: data.duration_ms ?? 5000,
        caption: data.caption ?? undefined,
        order_index: data.order_index ?? 0,
        hidden: data.hidden ?? false,
        video_url: data.video_url ?? undefined,
        video_duration_ms: data.video_duration_ms ?? undefined,
        video_status: data.video_status ?? 'none',
        is_video: data.is_video ?? false,
      },
    });
    
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async upsertImageDurations(data: (Partial<ImageDuration> & { filename: string })[]): Promise<number> {
    // Use transaction for batch upsert
    await this.prisma.$transaction(
      data.map(item => {
        // Filter out null values for Prisma
        const updateData: any = {};
        if (item.duration_ms !== undefined && item.duration_ms !== null) updateData.duration_ms = item.duration_ms;
        if (item.caption !== undefined) updateData.caption = item.caption ?? undefined;
        if (item.order_index !== undefined && item.order_index !== null) updateData.order_index = item.order_index;
        if (item.hidden !== undefined && item.hidden !== null) updateData.hidden = item.hidden;
        if (item.video_url !== undefined) updateData.video_url = item.video_url ?? undefined;
        if (item.video_duration_ms !== undefined) updateData.video_duration_ms = item.video_duration_ms ?? undefined;
        if (item.video_status !== undefined) updateData.video_status = item.video_status ?? undefined;
        if (item.is_video !== undefined && item.is_video !== null) updateData.is_video = item.is_video;

        return this.prisma.imageDuration.upsert({
          where: { filename: item.filename },
          update: updateData,
          create: {
            filename: item.filename,
            duration_ms: item.duration_ms ?? 5000,
            caption: item.caption ?? undefined,
            order_index: item.order_index ?? 0,
            hidden: item.hidden ?? false,
            video_url: item.video_url ?? undefined,
            video_duration_ms: item.video_duration_ms ?? undefined,
            video_status: item.video_status ?? 'none',
            is_video: item.is_video ?? false,
          },
        });
      })
    );
    
    return data.length;
  }

  async updateImageDuration(filename: string, data: Partial<ImageDuration>): Promise<ImageDuration> {
    // Filter out null and undefined values for Prisma
    const updateData: any = {};
    if (data.duration_ms !== undefined && data.duration_ms !== null) updateData.duration_ms = data.duration_ms;
    if (data.caption !== undefined) updateData.caption = data.caption ?? undefined;
    if (data.order_index !== undefined && data.order_index !== null) updateData.order_index = data.order_index;
    if (data.hidden !== undefined && data.hidden !== null) updateData.hidden = data.hidden;
    if (data.video_url !== undefined) updateData.video_url = data.video_url ?? undefined;
    if (data.video_duration_ms !== undefined) updateData.video_duration_ms = data.video_duration_ms ?? undefined;
    if (data.video_status !== undefined) updateData.video_status = data.video_status ?? undefined;
    if (data.is_video !== undefined && data.is_video !== null) updateData.is_video = data.is_video;

    const result = await this.prisma.imageDuration.update({
      where: { filename },
      data: updateData,
    });
    
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async deleteImageDuration(filename: string): Promise<void> {
    await this.prisma.imageDuration.delete({
      where: { filename },
    });
  }

  // Settings
  async getSettings(): Promise<SlideshowSetting[]> {
    const results = await this.prisma.slideshowSetting.findMany();
    return results.map(r => ({
      ...r,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    }));
  }

  async getSettingByKey(key: string): Promise<SlideshowSetting | null> {
    const result = await this.prisma.slideshowSetting.findUnique({
      where: { key },
    });
    
    if (!result) return null;
    
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async upsertSetting(key: string, value: string): Promise<SlideshowSetting> {
    const result = await this.prisma.slideshowSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  // Active Sessions
  async getAllActiveSessions(): Promise<ActiveSession[]> {
    const results = await this.prisma.activeSession.findMany();
    return results.map(r => ({
      ...r,
      page: r.page as "admin" | "remote",
      created_at: r.created_at.toISOString(),
      last_seen: r.last_seen.toISOString(),
    }));
  }

  async getActiveSessionByUserId(userId: string): Promise<ActiveSession | null> {
    const result = await this.prisma.activeSession.findFirst({
      where: { user_id: userId },
    });
    
    if (!result) return null;
    
    return {
      ...result,
      page: result.page as "admin" | "remote",
      created_at: result.created_at.toISOString(),
      last_seen: result.last_seen.toISOString(),
    };
  }

  async getActiveSessionBySessionId(sessionId: string): Promise<ActiveSession | null> {
    const result = await this.prisma.activeSession.findFirst({
      where: { session_id: sessionId },
    });
    
    if (!result) return null;
    
    return {
      ...result,
      page: result.page as "admin" | "remote",
      created_at: result.created_at.toISOString(),
      last_seen: result.last_seen.toISOString(),
    };
  }

  async createActiveSession(data: Omit<ActiveSession, 'id' | 'created_at'>): Promise<ActiveSession> {
    const result = await this.prisma.activeSession.create({
      data: {
        user_id: data.user_id,
        email: data.email,
        last_seen: new Date(data.last_seen),
        page: data.page,
        session_id: data.session_id,
        browser_id: data.browser_id,
      },
    });
    
    return {
      ...result,
      page: result.page as "admin" | "remote",
      created_at: result.created_at.toISOString(),
      last_seen: result.last_seen.toISOString(),
    };
  }

  async updateActiveSession(id: string, data: Partial<ActiveSession>): Promise<void> {
    await this.prisma.activeSession.update({
      where: { id },
      data: {
        last_seen: data.last_seen ? new Date(data.last_seen) : undefined,
        page: data.page,
      },
    });
  }

  async deleteActiveSession(userId: string): Promise<void> {
    await this.prisma.activeSession.deleteMany({
      where: { user_id: userId },
    });
  }

  async deleteAllActiveSessions(): Promise<void> {
    await this.prisma.activeSession.deleteMany({});
  }

  async deleteStaleActiveSessions(cutoffDate: Date): Promise<void> {
    await this.prisma.activeSession.deleteMany({
      where: {
        last_seen: {
          lt: cutoffDate,
        },
      },
    });
  }

  // Login Attempts
  async getLoginAttempts(filters?: { user_id?: string; status?: string }): Promise<LoginAttempt[]> {
    const where: any = {};
    if (filters?.user_id) where.user_id = filters.user_id;
    if (filters?.status) where.status = filters.status;
    
    const results = await this.prisma.loginAttempt.findMany({ where });
    return results.map(r => ({
      ...r,
      created_at: r.created_at.toISOString(),
      responded_at: r.responded_at?.toISOString() ?? null,
      expires_at: r.expires_at.toISOString(),
    }));
  }

  async createLoginAttempt(data: Omit<LoginAttempt, 'id' | 'created_at' | 'responded_at'>): Promise<LoginAttempt> {
    const result = await this.prisma.loginAttempt.create({
      data: {
        user_id: data.user_id,
        email: data.email,
        browser_id: data.browser_id,
        browser_info: data.browser_info,
        status: data.status,
        expires_at: new Date(data.expires_at),
      },
    });
    
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      responded_at: result.responded_at?.toISOString() ?? null,
      expires_at: result.expires_at.toISOString(),
    };
  }

  async updateLoginAttempt(id: string, data: Partial<LoginAttempt>): Promise<void> {
    await this.prisma.loginAttempt.update({
      where: { id },
      data: {
        status: data.status,
        responded_at: data.responded_at ? new Date(data.responded_at) : undefined,
      },
    });
  }
}

// Supabase Adapter
class SupabaseAdapter implements DatabaseAdapter {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  getAdapterType(): 'prisma' | 'supabase' {
    return 'supabase';
  }

  // Image Durations
  async getImageDurations(filters?: { hidden?: boolean; is_video?: boolean }): Promise<ImageDuration[]> {
    let query = this.supabase.from('image_durations').select('*').order('order_index', { ascending: true });
    
    if (filters?.hidden !== undefined) {
      query = query.eq('hidden', filters.hidden);
    }
    if (filters?.is_video !== undefined) {
      query = query.eq('is_video', filters.is_video);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return (data as any[]) || [];
  }

  async getImageDurationByFilename(filename: string): Promise<ImageDuration | null> {
    const { data, error } = await this.supabase
      .from('image_durations')
      .select('*')
      .eq('filename', filename)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return data as any;
  }

  async upsertImageDuration(data: Partial<ImageDuration> & { filename: string }): Promise<ImageDuration> {
    const { data: result, error } = await this.supabase
      .from('image_durations')
      .upsert({
        filename: data.filename,
        duration_ms: data.duration_ms ?? 5000,
        caption: data.caption ?? null,
        order_index: data.order_index ?? 0,
        hidden: data.hidden ?? false,
        video_url: data.video_url,
        video_duration_ms: data.video_duration_ms,
        video_status: data.video_status ?? 'none',
        is_video: data.is_video ?? false,
      }, { onConflict: 'filename' })
      .select()
      .single();
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return result as any;
  }

  async upsertImageDurations(data: (Partial<ImageDuration> & { filename: string })[]): Promise<number> {
    const upsertData = data.map(item => ({
      filename: item.filename,
      duration_ms: item.duration_ms ?? 5000,
      caption: item.caption ?? null,
      order_index: item.order_index ?? 0,
      hidden: item.hidden ?? false,
      video_url: item.video_url,
      video_duration_ms: item.video_duration_ms,
      video_status: item.video_status ?? 'none',
      is_video: item.is_video ?? false,
    }));
    
    const { error } = await this.supabase
      .from('image_durations')
      .upsert(upsertData, { onConflict: 'filename' });
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data.length;
  }

  async updateImageDuration(filename: string, data: Partial<ImageDuration>): Promise<ImageDuration> {
    const { data: result, error } = await this.supabase
      .from('image_durations')
      .update(data as any)
      .eq('filename', filename)
      .select()
      .single();
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return result as any;
  }

  async deleteImageDuration(filename: string): Promise<void> {
    const { error } = await this.supabase
      .from('image_durations')
      .delete()
      .eq('filename', filename);
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
  }

  // Settings
  async getSettings(): Promise<SlideshowSetting[]> {
    const { data, error } = await this.supabase
      .from('slideshow_settings')
      .select('*');
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return (data as any[]) || [];
  }

  async getSettingByKey(key: string): Promise<SlideshowSetting | null> {
    const { data, error } = await this.supabase
      .from('slideshow_settings')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return data as any;
  }

  async upsertSetting(key: string, value: string): Promise<SlideshowSetting> {
    const { data, error } = await this.supabase
      .from('slideshow_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .single();
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data as any;
  }

  // Active Sessions
  async getAllActiveSessions(): Promise<ActiveSession[]> {
    const { data, error } = await this.supabase
      .from('active_sessions' as any)
      .select('*');
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return (data as any[]) || [];
  }

  async getActiveSessionByUserId(userId: string): Promise<ActiveSession | null> {
    const { data, error } = await this.supabase
      .from('active_sessions' as any)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return data as any;
  }

  async getActiveSessionBySessionId(sessionId: string): Promise<ActiveSession | null> {
    const { data, error } = await this.supabase
      .from('active_sessions' as any)
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return data as any;
  }

  async createActiveSession(data: Omit<ActiveSession, 'id' | 'created_at'>): Promise<ActiveSession> {
    const { data: result, error } = await this.supabase
      .from('active_sessions' as any)
      .insert({
        user_id: data.user_id,
        email: data.email,
        last_seen: data.last_seen,
        page: data.page,
        session_id: data.session_id,
        browser_id: data.browser_id,
      })
      .select()
      .single();
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return result as any;
  }

  async updateActiveSession(id: string, data: Partial<ActiveSession>): Promise<void> {
    const { error } = await this.supabase
      .from('active_sessions' as any)
      .update(data as any)
      .eq('id', id);
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
  }

  async deleteActiveSession(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('active_sessions' as any)
      .delete()
      .eq('user_id', userId);
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
  }

  async deleteAllActiveSessions(): Promise<void> {
    const { error } = await this.supabase
      .from('active_sessions' as any)
      .delete()
      .neq('id', 'dummy'); // Delete all
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
  }

  async deleteStaleActiveSessions(cutoffDate: Date): Promise<void> {
    const { error } = await this.supabase
      .from('active_sessions' as any)
      .delete()
      .lt('last_seen', cutoffDate.toISOString());
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
  }

  // Login Attempts
  async getLoginAttempts(filters?: { user_id?: string; status?: string }): Promise<LoginAttempt[]> {
    let query = this.supabase.from('login_attempts' as any).select('*');
    
    if (filters?.user_id) query = query.eq('user_id', filters.user_id);
    if (filters?.status) query = query.eq('status', filters.status);
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return (data as any[]) || [];
  }

  async createLoginAttempt(data: Omit<LoginAttempt, 'id' | 'created_at' | 'responded_at'>): Promise<LoginAttempt> {
    const { data: result, error } = await this.supabase
      .from('login_attempts' as any)
      .insert({
        user_id: data.user_id,
        email: data.email,
        browser_id: data.browser_id,
        browser_info: data.browser_info,
        status: data.status,
        expires_at: data.expires_at,
      })
      .select()
      .single();
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return result as any;
  }

  async updateLoginAttempt(id: string, data: Partial<LoginAttempt>): Promise<void> {
    const { error } = await this.supabase
      .from('login_attempts' as any)
      .update(data as any)
      .eq('id', id);
    
    if (error) throw new Error(`Supabase error: ${error.message}`);
  }
}

// Auto-detect and create appropriate adapter
function createDatabaseAdapter(): DatabaseAdapter {
  // Try Prisma first if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    try {
      const prisma = new PrismaClient();
      console.log('[DB] Using Prisma adapter');
      return new PrismaAdapter(prisma);
    } catch (error) {
      console.warn('[DB] Prisma initialization failed, falling back to Supabase:', error);
    }
  }

  // Fallback to Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('No database configured. Set DATABASE_URL for Prisma or Supabase credentials.');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  console.log('[DB] Using Supabase adapter');
  return new SupabaseAdapter(supabase);
}

// Export singleton instance
export const db: DatabaseAdapter = createDatabaseAdapter();

// For Supabase Storage and Realtime, keep using Supabase directly
export { supabase, getSupabaseServiceRoleClient } from './supabase';

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Make Supabase optional - return null if not configured
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

let supabaseServiceRoleSingleton: SupabaseClient<Database> | null = null;

export const getSupabaseServiceRoleClient = (): SupabaseClient<Database> | null => {
  // Return null if Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!supabaseServiceRoleSingleton) {
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceRoleKey) {
      console.warn('[Supabase] Service role key not configured - storage features will be limited');
      return null;
    }

    supabaseServiceRoleSingleton = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }

  return supabaseServiceRoleSingleton;
};

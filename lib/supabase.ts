import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables");
}

// Client for public access (e.g., fetching images for slideshow)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let supabaseServiceRoleSingleton:
  | ReturnType<typeof createClient>
  | null = null;

export const getSupabaseServiceRoleClient = () => {
  if (!supabaseServiceRoleSingleton) {
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceRoleKey) {
      throw new Error("Missing Supabase service role environment variable");
    }

    supabaseServiceRoleSingleton = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false, // No session persistence needed for service role key
        },
      }
    );
  }

  return supabaseServiceRoleSingleton;
};

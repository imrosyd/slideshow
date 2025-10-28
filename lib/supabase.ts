import { createClient, SupabaseClient } from "@supabase/supabase-js"; // Keep SupabaseClient import
import { Database } from "./database.types"; // Import the Database type

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables");
}

// Client for public access (e.g., fetching images for slideshow)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey); // Add <Database>

let supabaseServiceRoleSingleton: SupabaseClient<Database> | null = null; // Explicitly type here

export const getSupabaseServiceRoleClient = () => {
  if (!supabaseServiceRoleSingleton) {
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceRoleKey) {
      throw new Error("Missing Supabase service role environment variable");
    }

    supabaseServiceRoleSingleton = createClient<Database>( // Add <Database>
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false, // No session persistence needed for service role key
        },
      }
    );
  }

  return supabaseServiceRoleSingleton; // No cast needed
};

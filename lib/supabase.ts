import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for public access (e.g., fetching images for slideshow)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for privileged server-side operations (e.g., uploads, deletes, config writes)
export const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false, // No session persistence needed for service role key
  },
});

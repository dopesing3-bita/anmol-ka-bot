import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** Service-role client — bypasses RLS. Server-side only, never import in a client component. */
export function createAdminSupabase() {
  return createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

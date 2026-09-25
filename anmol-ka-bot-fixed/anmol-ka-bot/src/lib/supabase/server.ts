import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/** Supabase client bound to the signed-in user's cookies (RLS applies). */
export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* called from a Server Component — middleware refreshes the session */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            /* no-op */
          }
        }
      }
    }
  );
}

export async function getSessionUser() {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

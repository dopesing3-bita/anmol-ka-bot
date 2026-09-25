import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runForUser } from '@/lib/pipeline';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between manual runs

export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile, error } = await admin.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (!profile.onboarded) return NextResponse.json({ error: 'Finish onboarding first' }, { status: 400 });

  const last = profile.last_manual_run_at ? new Date(profile.last_manual_run_at).getTime() : 0;
  const remaining = COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    return NextResponse.json(
      { error: `Rate limited. Try again in ${Math.ceil(remaining / 60000)} minute(s).` },
      { status: 429 }
    );
  }

  await admin.from('profiles').update({ last_manual_run_at: new Date().toISOString() }).eq('id', user.id);

  const result = await runForUser(profile as Profile, 'manual');
  return NextResponse.json({ ok: result.status === 'success', result });
}

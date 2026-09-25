import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { RESUME_BUCKET } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Permanently deletes the auth user; profiles/job_runs/sent_jobs cascade via FK. */
export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabase();

  // Best-effort storage cleanup (original + tailored resumes).
  try {
    const { data: files } = await admin.storage.from(RESUME_BUCKET).list(user.id, { limit: 1000 });
    const paths = (files ?? []).map((file) => `${user.id}/${file.name}`);
    if (paths.length) await admin.storage.from(RESUME_BUCKET).remove(paths);
  } catch (error) {
    console.error('[account] storage cleanup failed:', error);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

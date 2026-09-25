import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import { createServerSupabase } from '@/lib/supabase/server';
import type { JobRun, Profile, SentJob } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — Anmol-Ka-Bot' };

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');
  if (!profile.onboarded) redirect('/onboarding');

  const [{ data: runs }, { data: jobs }, { count }] = await Promise.all([
    supabase.from('job_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('sent_jobs').select('*').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(15),
    supabase.from('sent_jobs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  ]);

  return (
    <DashboardClient
      profile={profile as Profile}
      lastRun={(runs?.[0] as JobRun) ?? null}
      recentJobs={(jobs ?? []) as SentJob[]}
      totalSent={count ?? 0}
    />
  );
}

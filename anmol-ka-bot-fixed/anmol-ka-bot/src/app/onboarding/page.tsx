import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/OnboardingForm';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up your agent — Anmol-Ka-Bot' };

export default async function OnboardingPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set up your job agent</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        This is what Gemini uses every morning to search, score and tailor. The more specific you are, the better the matches.
      </p>
      <div className="card mt-6">
        <OnboardingForm profile={profile as Profile} mode="onboarding" />
      </div>
    </main>
  );
}

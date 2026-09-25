import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings — Anmol-Ka-Bot' };

export default async function SettingsPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  return <SettingsClient profile={profile as Profile} />;
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const profileSchema = z.object({
  full_name: z.string().max(120).optional().default(''),
  job_roles: z.array(z.string().min(1).max(80)).min(1).max(10),
  preferred_platforms: z.array(z.string().min(1).max(60)).min(1).max(12),
  experience_years: z.coerce.number().min(0).max(60),
  experience_summary: z.string().max(3000).optional().default(''),
  location_preference: z.string().max(120).optional().default('')
});

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, email: user.email, onboarded: true })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? 50) || 50, 200);

  const { data, error } = await supabase
    .from('sent_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ jobs: data ?? [] });
}

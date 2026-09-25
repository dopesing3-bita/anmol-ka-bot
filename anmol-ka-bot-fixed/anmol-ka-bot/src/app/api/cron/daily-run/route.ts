import { NextResponse, type NextRequest } from 'next/server';
import { runDailyPipeline } from '@/lib/pipeline';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // seconds (Vercel Pro); Hobby caps at 60

/**
 * Daily cron entrypoint. Wired in vercel.json → "30 1 * * *" (07:00 IST).
 * Protected by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */
async function handle(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const results = await runDailyPipeline('cron');
    return NextResponse.json({
      ok: true,
      users_processed: results.length,
      succeeded: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      jobs_sent: results.reduce((sum, r) => sum + r.jobsSent, 0),
      emails_sent: results.reduce((sum, r) => sum + r.emailsSent, 0),
      duration_ms: Date.now() - startedAt,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron] fatal:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function isAuthorised(request: NextRequest): boolean {
  const secret = env.cronSecret();
  const header = request.headers.get('authorization') || '';
  if (header === `Bearer ${secret}`) return true;
  if (request.headers.get('x-cron-secret') === secret) return true;
  return new URL(request.url).searchParams.get('secret') === secret;
}

export const GET = handle;
export const POST = handle;

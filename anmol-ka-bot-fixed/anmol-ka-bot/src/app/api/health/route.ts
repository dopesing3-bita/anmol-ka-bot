import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Quick config check: /api/health tells you which env vars are missing. */
export async function GET() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'RESEND_API_KEY',
    'CRON_SECRET',
    'APP_URL'
  ];
  const missing = required.filter((key) => !process.env[key]);

  return NextResponse.json({
    ok: missing.length === 0,
    missing_env: missing,
    email_mode: process.env.EMAIL_MODE || 'digest',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    time: new Date().toISOString()
  });
}

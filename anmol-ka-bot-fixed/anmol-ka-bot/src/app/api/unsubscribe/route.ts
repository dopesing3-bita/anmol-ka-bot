import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyToken } from '@/lib/hash';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** One-click pause link used in every email footer. */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';

  if (!uid || !verifyToken(uid, token, env.unsubscribeSecret())) {
    return html('Invalid or expired link', 'This unsubscribe link is not valid. You can pause emails from your dashboard.', 400);
  }

  const { error } = await createAdminSupabase().from('profiles').update({ is_active: false }).eq('id', uid);
  if (error) return html('Something went wrong', error.message, 500);

  return html('Daily emails paused', 'You will not receive further job digests until you resume from your dashboard.', 200);
}

function html(title: string, message: string, status: number) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6fb;display:flex;align-items:center;justify-content:center;min-height:100vh;">
       <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;max-width:440px;text-align:center;">
         <h1 style="font-size:20px;margin:0 0 10px;color:#111827;">${title}</h1>
         <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 20px;">${message}</p>
         <a href="${env.appUrl()}/dashboard" style="display:inline-block;padding:10px 20px;background:#3b6ef6;color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Go to dashboard</a>
       </div>
     </body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

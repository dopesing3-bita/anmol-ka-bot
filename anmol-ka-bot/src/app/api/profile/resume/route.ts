import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { RESUME_BUCKET } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/resume.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  let text = '';
  try {
    // Deep import avoids pdf-parse's index.js debug-mode file read.
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as (b: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    text = (parsed.text || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 40000);
  } catch (error) {
    console.error('[resume] parse failed:', error);
  }

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ resume_file_path: path, resume_text: text })
    .eq('id', user.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    path,
    characters_extracted: text.length,
    warning: text.length < 200 ? 'Very little text extracted — the PDF may be a scan. Paste a summary manually.' : undefined
  });
}

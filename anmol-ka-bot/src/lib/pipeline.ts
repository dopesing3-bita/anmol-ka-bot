import { createAdminSupabase } from '@/lib/supabase/admin';
import { findJobsForProfile } from '@/lib/gemini/search';
import { tailorResumeForJob } from '@/lib/gemini/tailor';
import { markdownToPdf } from '@/lib/pdf';
import { sendAdminAlert, sendJobEmails } from '@/lib/email/send';
import { jobHash } from '@/lib/hash';
import { env, RESUME_BUCKET } from '@/lib/env';
import { mapWithConcurrency, todayIso } from '@/lib/utils';
import type { Profile, RawJob, ScoredJob } from '@/lib/types';

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

export type UserRunResult = {
  userId: string;
  email: string;
  status: 'success' | 'failed' | 'skipped';
  jobsFound: number;
  jobsSent: number;
  emailsSent: number;
  error?: string;
};

/** Entry point for the cron route: process every active user. */
export async function runDailyPipeline(trigger: 'cron' | 'manual' = 'cron'): Promise<UserRunResult[]> {
  const supabase = createAdminSupabase();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .eq('onboarded', true)
    .order('created_at', { ascending: true })
    .limit(env.maxUsersPerRun());

  if (error) throw new Error(`Failed to load active profiles: ${error.message}`);
  if (!profiles?.length) return [];

  const results = await mapWithConcurrency(profiles as Profile[], env.userConcurrency(), (profile) =>
    runForUser(profile, trigger)
  );

  const failed = results.filter((r) => r.status === 'failed');
  if (failed.length) {
    await sendAdminAlert(
      `${failed.length} user run(s) failed on ${todayIso()}`,
      failed.map((f) => `${f.email}: ${f.error}`).join('\n')
    );
  }

  return results;
}

/** Full pipeline for a single user. Never throws — always returns a result. */
export async function runForUser(profile: Profile, trigger: 'cron' | 'manual' = 'cron'): Promise<UserRunResult> {
  const supabase = createAdminSupabase();
  const base: UserRunResult = {
    userId: profile.id,
    email: profile.email,
    status: 'success',
    jobsFound: 0,
    jobsSent: 0,
    emailsSent: 0
  };

  const { data: run } = await supabase
    .from('job_runs')
    .insert({ user_id: profile.id, run_date: todayIso(), status: 'pending', trigger })
    .select('id')
    .single();

  const runId: string | null = run?.id ?? null;

  try {
    // 1. Crawl via Gemini + Google Search grounding
    const found = await findJobsForProfile(profile, Math.max(30, env.maxJobsPerUser() * 2));
    base.jobsFound = found.length;

    // 2. De-dup against everything already sent to this user
    const candidates = await filterAlreadySent(profile.id, found);
    if (!candidates.length) {
      await finishRun(runId, { status: 'success', jobs_found: found.length, jobs_sent: 0, emails_sent: 0 });
      return base;
    }

    // 3. Score + tailor (capped, concurrency-limited)
    const capped = candidates.slice(0, env.maxJobsPerUser());
    const threshold = env.relevanceThreshold();

    const tailored = await mapWithConcurrency(capped, 3, async (job): Promise<ScoredJob | null> => {
      try {
        const result = await tailorResumeForJob(profile, job);
        if (result.relevance_score < threshold) return null;
        return {
          ...job,
          job_hash: jobHash(job.url, job.title, job.company),
          relevance_score: result.relevance_score,
          why_relevant: result.why_relevant,
          tailored_resume_markdown: result.tailored_resume_markdown
        };
      } catch (error) {
        console.error(`[pipeline] tailoring failed for ${job.company}:`, error);
        return null;
      }
    });

    const qualified = (tailored.filter(Boolean) as ScoredJob[]).sort(
      (a, b) => b.relevance_score - a.relevance_score
    );

    if (!qualified.length) {
      await finishRun(runId, { status: 'success', jobs_found: found.length, jobs_sent: 0, emails_sent: 0 });
      return base;
    }

    // 4. Render tailored resumes to PDF and upload to private storage
    await mapWithConcurrency(qualified, 4, async (job) => {
      try {
        const pdf = await markdownToPdf(job.tailored_resume_markdown);
        const path = `${profile.id}/tailored/${todayIso()}/${job.job_hash.slice(0, 12)}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from(RESUME_BUCKET)
          .upload(path, Buffer.from(pdf), { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        const { data: signed } = await supabase.storage.from(RESUME_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
        job.tailored_resume_path = path;
        job.tailored_resume_url = signed?.signedUrl;
      } catch (error) {
        console.error(`[pipeline] resume PDF failed for ${job.company}:`, error);
      }
    });

    // 5. Email
    const emailsSent = await sendJobEmails(profile, qualified);

    // 6. Log what was sent so it is never re-sent
    await supabase.from('sent_jobs').upsert(
      qualified.map((job) => ({
        user_id: profile.id,
        run_id: runId,
        job_url: job.url,
        job_hash: job.job_hash,
        job_title: job.title,
        company: job.company,
        platform: job.platform,
        location: job.location ?? null,
        posted_date: job.posted_date ?? null,
        relevance_score: job.relevance_score,
        why_relevant: job.why_relevant,
        tailored_resume_path: job.tailored_resume_path ?? null
      })),
      { onConflict: 'user_id,job_hash', ignoreDuplicates: true }
    );

    await finishRun(runId, {
      status: 'success',
      jobs_found: found.length,
      jobs_sent: qualified.length,
      emails_sent: emailsSent
    });

    return { ...base, jobsSent: qualified.length, emailsSent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[pipeline] run failed for ${profile.email}:`, message);
    await finishRun(runId, { status: 'failed', error: message.slice(0, 900) });
    return { ...base, status: 'failed', error: message };
  }
}

async function filterAlreadySent(userId: string, jobs: RawJob[]): Promise<RawJob[]> {
  if (!jobs.length) return [];
  const supabase = createAdminSupabase();
  const hashes = jobs.map((job) => jobHash(job.url, job.title, job.company));

  const { data } = await supabase.from('sent_jobs').select('job_hash').eq('user_id', userId).in('job_hash', hashes);

  const seen = new Set((data ?? []).map((row: { job_hash: string }) => row.job_hash));
  const unique = new Set<string>();

  return jobs.filter((job, index) => {
    const hash = hashes[index];
    if (seen.has(hash) || unique.has(hash)) return false;
    unique.add(hash);
    return true;
  });
}

async function finishRun(
  runId: string | null,
  patch: Partial<{ status: string; jobs_found: number; jobs_sent: number; emails_sent: number; error: string }>
) {
  if (!runId) return;
  await createAdminSupabase().from('job_runs').update(patch).eq('id', runId);
}

import { Resend } from 'resend';
import { env } from '@/lib/env';
import { retry, sleep } from '@/lib/utils';
import { signToken } from '@/lib/hash';
import {
  digestEmailHtml,
  digestEmailText,
  digestSubject,
  singleJobEmailHtml,
  singleJobSubject
} from '@/lib/email/template';
import type { Profile, ScoredJob } from '@/lib/types';

function client() {
  return new Resend(env.resendApiKey());
}

export function buildUnsubscribeUrl(userId: string): string {
  const token = signToken(userId, env.unsubscribeSecret());
  return `${env.appUrl()}/api/unsubscribe?uid=${userId}&token=${token}`;
}

/**
 * Sends the daily results.
 * EMAIL_MODE=digest (default, recommended): 1 email containing all job cards.
 * EMAIL_MODE=individual: one email per job — spam/reputation risk, kept as a toggle.
 * Returns the number of emails successfully sent.
 */
export async function sendJobEmails(profile: Profile, jobs: ScoredJob[]): Promise<number> {
  if (!jobs.length) return 0;

  const resend = client();
  const dashboardUrl = `${env.appUrl()}/dashboard`;
  const unsubscribeUrl = buildUnsubscribeUrl(profile.id);
  const name = (profile.full_name || '').split(' ')[0] || '';

  if (env.emailMode() === 'individual') {
    let sent = 0;
    for (const job of jobs) {
      try {
        await retry(
          () =>
            resend.emails.send({
              from: env.resendFrom(),
              to: profile.email,
              subject: singleJobSubject(job),
              html: singleJobEmailHtml({ name, job, dashboardUrl, unsubscribeUrl }),
              headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` }
            }),
          { label: `resend:single:${job.company}`, attempts: 2 }
        );
        sent++;
      } catch (error) {
        console.error(`[resend] failed for ${job.company}:`, error);
      }
      await sleep(600); // stay under Resend's per-second rate limit
    }
    return sent;
  }

  await retry(
    () =>
      resend.emails.send({
        from: env.resendFrom(),
        to: profile.email,
        subject: digestSubject(jobs.length),
        html: digestEmailHtml({ name, jobs, dashboardUrl, unsubscribeUrl }),
        text: digestEmailText(jobs),
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` }
      }),
    { label: 'resend:digest', attempts: 3 }
  );

  return 1;
}

/** Fire-and-forget alert so silent failures surface to the operator. */
export async function sendAdminAlert(subject: string, body: string): Promise<void> {
  const to = env.adminAlertEmail();
  if (!to) return;
  try {
    await client().emails.send({
      from: env.resendFrom(),
      to,
      subject: `[Anmol-Ka-Bot] ${subject}`,
      text: body
    });
  } catch (error) {
    console.error('[resend] admin alert failed:', error);
  }
}

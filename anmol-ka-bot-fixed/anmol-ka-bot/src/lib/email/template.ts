import { escapeHtml } from '@/lib/utils';
import type { ScoredJob } from '@/lib/types';

type DigestArgs = {
  name: string;
  jobs: ScoredJob[];
  dashboardUrl: string;
  unsubscribeUrl: string;
};

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

export function digestSubject(count: number): string {
  return `Your ${count} job ${count === 1 ? 'match' : 'matches'} for today — Anmol-Ka-Bot`;
}

export function singleJobSubject(job: ScoredJob): string {
  return `${job.title} @ ${job.company} — ${job.relevance_score}% match`;
}

export function digestEmailHtml({ name, jobs, dashboardUrl, unsubscribeUrl }: DigestArgs): string {
  const cards = jobs.map(jobCard).join('');
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return shell(
    `
    <h1 style="margin:0 0 6px;font-size:22px;color:#111827;">Good morning${name ? `, ${escapeHtml(name)}` : ''} 👋</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      ${jobs.length} fresh ${jobs.length === 1 ? 'opening' : 'openings'} matched your profile on ${today}.
      Each one comes with a resume tailored specifically for it.
    </p>
    ${cards}
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:11px 22px;background:#3b6ef6;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open dashboard</a>
    </div>
  `,
    unsubscribeUrl
  );
}

export function singleJobEmailHtml({ name, job, dashboardUrl, unsubscribeUrl }: Omit<DigestArgs, 'jobs'> & { job: ScoredJob }): string {
  return shell(
    `
    <h1 style="margin:0 0 6px;font-size:22px;color:#111827;">A match for you${name ? `, ${escapeHtml(name)}` : ''}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Tailored resume attached below the listing.</p>
    ${jobCard(job)}
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:11px 22px;background:#3b6ef6;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open dashboard</a>
    </div>
  `,
    unsubscribeUrl
  );
}

function jobCard(job: ScoredJob): string {
  const score = job.relevance_score;
  const scoreColor = score >= 80 ? '#047857' : score >= 65 ? '#b45309' : '#4b5563';
  const scoreBg = score >= 80 ? '#ecfdf5' : score >= 65 ? '#fffbeb' : '#f3f4f6';

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:14px;background:#ffffff;">
    <tr><td style="padding:16px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:16px;font-weight:700;color:#111827;line-height:1.35;">
            ${escapeHtml(job.title)}
            <div style="font-size:13px;font-weight:500;color:#4b5563;margin-top:3px;">${escapeHtml(job.company)}${
              job.location ? ` · ${escapeHtml(job.location)}` : ''
            }</div>
          </td>
          <td align="right" style="white-space:nowrap;vertical-align:top;">
            <span style="display:inline-block;padding:4px 9px;border-radius:999px;background:${scoreBg};color:${scoreColor};font-size:12px;font-weight:700;">${score}% match</span>
          </td>
        </tr>
      </table>
      <div style="margin-top:9px;">
        <span style="display:inline-block;padding:3px 8px;border-radius:5px;background:#eef4ff;color:#2b55d4;font-size:11px;font-weight:600;">${escapeHtml(
          job.platform
        )}</span>
        ${
          job.posted_date
            ? `<span style="display:inline-block;margin-left:6px;font-size:11px;color:#9ca3af;">Posted ${escapeHtml(job.posted_date)}</span>`
            : ''
        }
      </div>
      ${
        job.why_relevant
          ? `<p style="margin:11px 0 0;font-size:13px;line-height:1.55;color:#374151;"><strong style="color:#111827;">Why it fits:</strong> ${escapeHtml(
              job.why_relevant
            )}</p>`
          : ''
      }
      <div style="margin-top:14px;">
        <a href="${job.url}" style="display:inline-block;padding:9px 16px;background:#111827;color:#ffffff;border-radius:7px;font-size:13px;font-weight:600;text-decoration:none;">Apply now</a>
        ${
          job.tailored_resume_url
            ? `<a href="${job.tailored_resume_url}" style="display:inline-block;margin-left:8px;padding:9px 16px;background:#ffffff;color:#2b55d4;border:1px solid #c7d7fe;border-radius:7px;font-size:13px;font-weight:600;text-decoration:none;">Download tailored resume</a>`
            : ''
        }
      </div>
    </td></tr>
  </table>`;
}

function shell(body: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anmol-Ka-Bot</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
        <tr><td style="padding-bottom:16px;font-size:15px;font-weight:700;color:#2b55d4;letter-spacing:-0.2px;">⚡ Anmol-Ka-Bot</td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:26px 24px;">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 6px;font-size:11.5px;line-height:1.6;color:#9ca3af;text-align:center;">
          Sent by Anmol-Ka-Bot, your automated job-hunting agent.<br>
          <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Pause daily emails</a> ·
          Links to tailored resumes expire in 7 days.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function digestEmailText(jobs: ScoredJob[]): string {
  return [
    `Your job matches for today (${jobs.length}):`,
    '',
    ...jobs.map(
      (job, i) =>
        `${i + 1}. ${job.title} @ ${job.company} — ${job.relevance_score}% match [${job.platform}]\n   Apply: ${job.url}${
          job.tailored_resume_url ? `\n   Tailored resume: ${job.tailored_resume_url}` : ''
        }`
    ),
    '',
    '— Anmol-Ka-Bot'
  ].join('\n');
}

# Deployment Guide — Anmol-Ka-Bot (Vercel)

## 1. Keys

| Service | Where | What you need |
|---|---|---|
| Supabase | supabase.com → New project | Project URL, `anon` key, `service_role` key |
| Google Gemini | aistudio.google.com/apikey | API key |
| Resend | resend.com → API Keys | API key + verified sending domain |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Database

Supabase Dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
Verify `profiles`, `job_runs`, `sent_jobs` exist and a private `resumes` bucket was created.
Then **Authentication → Providers → Email**: enable it.

## 3. Local

```bash
npm install
cp .env.example .env.local     # set APP_URL=http://localhost:3000
npm run dev
```

`http://localhost:3000/api/health` should return `"ok": true`.
Sign up → onboard (upload a text-based PDF resume) → dashboard → **Run now**.

Type-check and lint before pushing:

```bash
npm run typecheck
npm run lint
npm run build
```

## 4. Vercel

1. vercel.com/new → import the repo (auto-detects Next.js).
2. Add every variable from `.env.example` under **Environment Variables** (Production + Preview).
3. Deploy, then set `APP_URL` to your live URL and **redeploy** so email links resolve correctly.
4. Confirm `/api/health` returns `"ok": true`.

### Cron

`vercel.json` registers `/api/cron/daily-run` at `30 1 * * *` UTC = **07:00 IST**. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically.

> **Hobby vs Pro:** Hobby caps function duration at 60s; the cron and run-now routes declare
> `maxDuration = 300`, which requires Pro. On Hobby, lower `MAX_JOBS_PER_USER` and `MAX_USERS_PER_RUN`.

## 5. Resend

Verify your domain (DKIM + SPF), then set `RESEND_FROM` to an address on it. Until verified,
`onboarding@resend.dev` only delivers to your own Resend account email.

## Tuning

| Variable | Default | Effect |
|---|---|---|
| `MAX_JOBS_PER_USER` | 20 | Jobs tailored and sent per user per day |
| `RELEVANCE_THRESHOLD` | 50 | Minimum score to be emailed |
| `MAX_USERS_PER_RUN` | 100 | Safety valve on daily spend |
| `USER_CONCURRENCY` | 5 | Users processed in parallel |
| `EMAIL_MODE` | `digest` | `individual` sends one email per job |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Swap for a Pro model for quality at higher cost |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `TS7016` on `pdf-parse/lib/pdf-parse.js` | `src/types/pdf-parse.d.ts` must be present and matched by the tsconfig `**/*.ts` include |
| `401` on cron | `CRON_SECRET` mismatch between Vercel and the caller |
| Function timeout | Lower `MAX_JOBS_PER_USER` / `USER_CONCURRENCY`, or upgrade to Pro |
| No jobs found | Platform list too narrow or roles too niche |
| All jobs filtered out | `RELEVANCE_THRESHOLD` too high, or resume text failed to extract |
| Resume text empty | PDF is a scan; use a text-based PDF or fill the summary field |
| Emails not arriving | Resend domain unverified or `RESEND_FROM` mismatch |
| RLS errors in cron | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong in Vercel |

# ⚡ Anmol-Ka-Bot — AI Job Hunting Agent

A Next.js 14 app that hunts jobs for you every morning. It searches live postings with Gemini
(Google Search grounding), scores each one against your profile, rewrites your resume for every
match, and emails you a single digest at 7:00 AM IST. Pause, resume or delete your account any time.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Auth + Postgres + Storage) ·
Google Gemini · Resend · Vercel Cron.

---

## What's in the box

```
anmol-ka-bot/
├── vercel.json                  # daily cron: 01:30 UTC = 07:00 IST
├── .env.example                 # every env var you need
├── supabase/schema.sql          # tables, RLS, triggers, storage bucket — run once
├── src/
│   ├── middleware.ts            # session refresh + route protection
│   ├── app/
│   │   ├── page.tsx             # landing page
│   │   ├── login/ signup/       # Supabase email+password auth
│   │   ├── onboarding/          # roles, platforms, experience, resume upload
│   │   ├── dashboard/           # pause toggle, last-run stats, history, "Run now"
│   │   ├── settings/            # edit profile, change password, delete account
│   │   └── api/
│   │       ├── cron/daily-run/  # CRON_SECRET-protected pipeline entrypoint
│   │       ├── profile/         # GET/POST profile, /resume upload, /toggle pause
│   │       ├── jobs/history/    # sent-jobs history
│   │       ├── run-now/         # manual trigger, 1/hour rate limit
│   │       ├── unsubscribe/     # signed one-click pause link from email footer
│   │       ├── account/delete/  # hard delete + storage cleanup
│   │       └── health/          # env-var sanity check
│   ├── components/              # AuthForm, TagInput, PlatformPicker, Onboarding, Dashboard, Settings
│   └── lib/
│       ├── pipeline.ts          # ← the agent: search → dedup → score/tailor → PDF → email → log
│       ├── gemini/search.ts     # grounded job search, defensive JSON parsing
│       ├── gemini/tailor.ts     # structured-output scoring + resume rewrite
│       ├── email/send.ts        # Resend, digest or individual mode
│       ├── email/template.ts    # responsive HTML email
│       ├── pdf.ts               # markdown → PDF (pdf-lib, no headless Chrome)
│       ├── supabase/            # browser / server / service-role clients
│       └── hash.ts, utils.ts    # dedup hashing, HMAC tokens, retry + concurrency
└── DEPLOYMENT.md                # step-by-step deploy guide
```

## The daily pipeline

1. **Load** every profile where `is_active = true` and `onboarded = true` (capped by `MAX_USERS_PER_RUN`).
2. **Search** — Gemini with Google Search grounding returns ~30–40 live postings across the user's chosen platforms.
   *No HTML scraping:* LinkedIn/Naukri/Indeed scraping breaks constantly and violates their ToS.
3. **De-dup** — each job is hashed (normalised URL + title + company, tracking params stripped) and checked against `sent_jobs`.
4. **Score + tailor** — one structured Gemini call per job returns `relevance_score`, `why_relevant` and a full tailored resume. Anything below `RELEVANCE_THRESHOLD` (default 50) is dropped.
5. **Render** — tailored resume → PDF → private Supabase Storage → 7-day signed URL.
6. **Email** — one digest with all job cards (apply link, match score, resume download). `EMAIL_MODE=individual` sends one email per job instead.
7. **Log** — `job_runs` gets the run summary, `sent_jobs` gets every delivered job so it never repeats.

Failures are isolated per user, every external call retries with exponential backoff, and any failed run
triggers an admin alert email if `ADMIN_ALERT_EMAIL` is set.

## Quick start (local)

```bash
npm install
cp .env.example .env.local     # fill in your keys
# run supabase/schema.sql in Supabase Studio → SQL Editor
npm run dev
```

Visit `http://localhost:3000/api/health` — it lists any missing env vars.
Then sign up → onboard → hit **Run now** on the dashboard to test the whole pipeline immediately.

Full deploy instructions: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## Design decisions worth knowing

| Decision | Why |
|---|---|
| Gemini grounded search instead of scrapers | Legally safer, doesn't break on anti-bot changes, returns cited live links |
| One digest email, not 20 separate ones | 20/day/user trips spam filters and burns Resend quota. Flip `EMAIL_MODE=individual` if you insist |
| `pdf-lib` instead of Puppeteer | Fits serverless bundle limits, near-zero cold start |
| Service-role key only in `lib/supabase/admin.ts` | RLS protects everything else; the key never reaches the browser |
| De-dup table | Same job is never emailed twice, which also caps Gemini spend |

## Cost control

Per active user per day: **1 search call + up to 20 tailoring calls**. With `gemini-2.5-flash` that's cheap,
but set `MAX_USERS_PER_RUN` and `MAX_JOBS_PER_USER` conservatively while testing. Resend's free tier caps
daily sends — digest mode uses exactly 1 email per user per day.

## Security

- RLS on every table; users only ever read their own rows.
- Cron route requires `Authorization: Bearer $CRON_SECRET`.
- Resume downloads use short-lived signed URLs from a **private** bucket.
- `/api/run-now` is rate-limited to once per hour per user.
- Uploads restricted to PDF, 5 MB.
- HMAC-signed one-click unsubscribe in every email footer, plus `List-Unsubscribe` header.

# ⚡ Anmol-Ka-Bot — AI Job Hunting Agent

A Next.js 14 app that hunts jobs for you every morning. It searches live postings with Gemini
(Google Search grounding), scores each one against your profile, rewrites your resume for every
match, and emails you a single digest at 7:00 AM IST.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Google Gemini · Resend · Vercel Cron.

## Layout

```
src/
├── middleware.ts            # session refresh + route protection
├── types/pdf-parse.d.ts     # declaration for the pdf-parse deep import
├── app/
│   ├── page.tsx  login/  signup/  onboarding/  dashboard/  settings/
│   └── api/  cron/daily-run · profile (+/resume,/toggle) · jobs/history
│              run-now · unsubscribe · account/delete · health
├── components/              # AuthForm, TagInput, PlatformPicker, Onboarding, Dashboard, Settings
└── lib/
    ├── pipeline.ts          # search → dedup → score/tailor → PDF → email → log
    ├── gemini/  email/  supabase/  pdf.ts  hash.ts  utils.ts  env.ts
```

## The daily pipeline

1. Load active, onboarded profiles.
2. Gemini + Google Search grounding returns live postings for the user's platforms.
3. De-dup by hash (normalised URL + title + company) against `sent_jobs`.
4. One structured Gemini call per job → `relevance_score`, `why_relevant`, tailored resume.
5. Resume markdown → PDF → private Supabase Storage → 7-day signed URL.
6. One digest email (or per-job, via `EMAIL_MODE=individual`).
7. Log to `job_runs` and `sent_jobs`.

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in your keys
# run supabase/schema.sql in Supabase Studio → SQL Editor
npm run dev
```

Check `http://localhost:3000/api/health` — it lists any missing env vars.
Full deploy steps: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Note on PDF parsing

`src/app/api/profile/resume/route.ts` imports `pdf-parse/lib/pdf-parse.js` rather than the package
root. The root `index.js` runs a debug branch that reads a test PDF from disk when `module.parent`
is falsy, which throws in a bundled serverless function. `@types/pdf-parse` only declares the bare
`pdf-parse` specifier, so `src/types/pdf-parse.d.ts` supplies the declaration for the subpath. Both
`pdf-parse` and `pdf-lib` are listed in `serverComponentsExternalPackages` in `next.config.mjs` so
they stay external at runtime.

## Security

- RLS on every table; users read only their own rows.
- Cron route requires `Authorization: Bearer $CRON_SECRET`.
- Resume downloads use short-lived signed URLs from a private bucket.
- `/api/run-now` rate-limited to once per hour per user.
- Uploads restricted to PDF, 5 MB.
- HMAC-signed one-click unsubscribe plus `List-Unsubscribe` header.

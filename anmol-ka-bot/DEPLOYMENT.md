# Deployment Guide — Anmol-Ka-Bot

From zip file to live app in about 30 minutes. Follow in order.

---

## 1. Get your API keys

| Service | Where | What you need |
|---|---|---|
| **Supabase** | [supabase.com](https://supabase.com) → New project | Project URL, `anon` key, `service_role` key (Settings → API) |
| **Google Gemini** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | API key |
| **Resend** | [resend.com](https://resend.com) → API Keys | API key + a verified sending domain |

For `CRON_SECRET` and `UNSUBSCRIBE_SECRET`, generate random strings:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Set up the database

1. Supabase Dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. Confirm under **Table Editor**: `profiles`, `job_runs`, `sent_jobs` exist.
4. Confirm under **Storage**: a private bucket named `resumes` exists.

Then **Authentication → Providers → Email**: enable it. While testing, turn **Confirm email** off so
signup logs you straight in; turn it back on before going public.

---

## 3. Run it locally first

```bash
unzip anmol-ka-bot.zip && cd anmol-ka-bot
npm install
cp .env.example .env.local
```

Fill `.env.local` with your real values, set `APP_URL=http://localhost:3000`, then:

```bash
npm run dev
```

Check `http://localhost:3000/api/health` → it should return `"ok": true`. If not, it names the missing vars.

**Test the full pipeline:** sign up → complete onboarding (upload a real PDF resume) → dashboard → **Run now**.
Watch your terminal for `[pipeline]` logs and check your inbox.

You can also hit the cron route directly:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/daily-run
```

---

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Anmol-Ka-Bot: AI job hunting agent"
git branch -M main
git remote add origin https://github.com/<you>/anmol-ka-bot.git
git push -u origin main
```

`.env.local` is gitignored — verify your keys are not in the commit.

---

## 5. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → import the repo. Framework auto-detects as Next.js.
2. **Before clicking Deploy**, add every variable from `.env.example` under **Environment Variables**
   (Production + Preview). Leave `APP_URL` as a placeholder for now.
3. Deploy.
4. Copy your live URL, update `APP_URL` to it (e.g. `https://anmol-ka-bot.vercel.app`), and **redeploy**
   so email links point to the right place.
5. Visit `https://your-app.vercel.app/api/health` → expect `"ok": true`.

### Cron

`vercel.json` already registers the job:

```json
{ "crons": [{ "path": "/api/cron/daily-run", "schedule": "30 1 * * *" }] }
```

`30 1 * * *` UTC = **07:00 IST**. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`,
so no extra wiring is needed. Confirm it appears under **Project → Settings → Cron Jobs** after deploy.

> **Hobby vs Pro:** Hobby allows one cron invocation per day (fine here) but caps function duration at
> 60 seconds, which is tight once you have several users. Pro raises it to 300s, matching the
> `maxDuration` already set in the cron and run-now routes. Pro is recommended beyond a handful of users.

---

## 6. Configure Resend properly

1. Resend → **Domains** → add and verify your domain (DKIM + SPF records).
2. Set `RESEND_FROM="Anmol-Ka-Bot <jobs@yourdomain.com>"` using that domain.
3. Until the domain is verified you can use `onboarding@resend.dev`, but it only delivers to your own
   Resend account email.

---

## 7. Post-deploy checklist

- [ ] `/api/health` returns `ok: true`
- [ ] Signup → onboarding → dashboard flow works on the live URL
- [ ] Resume upload reports a healthy character count (a scanned PDF will report near zero)
- [ ] **Run now** delivers an email with working apply links and resume downloads
- [ ] The unsubscribe link in the email footer flips the dashboard toggle to paused
- [ ] Cron job is listed in Vercel settings
- [ ] Next morning: check Vercel logs for the 01:30 UTC invocation

---

## Tuning knobs

| Variable | Default | Effect |
|---|---|---|
| `MAX_JOBS_PER_USER` | 20 | Jobs tailored and sent per user per day |
| `RELEVANCE_THRESHOLD` | 50 | Minimum score to be emailed. Raise to 65+ for fewer, better matches |
| `MAX_USERS_PER_RUN` | 100 | Safety valve on total daily spend |
| `USER_CONCURRENCY` | 5 | Users processed in parallel. Lower if you hit Gemini rate limits |
| `EMAIL_MODE` | `digest` | `individual` sends one email per job (spam risk) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Switch to a Pro model for quality at higher cost |

Changing the send time: edit the cron expression in `vercel.json` (it's UTC — subtract 5h30m from your
desired IST time) and redeploy.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `401 Unauthorized` on cron | `CRON_SECRET` in Vercel doesn't match what you're sending |
| Function timeout | Lower `MAX_JOBS_PER_USER` / `USER_CONCURRENCY`, or upgrade to Pro for 300s |
| No jobs found | Platform list too narrow or roles too niche — add platforms, broaden roles |
| All jobs filtered out | `RELEVANCE_THRESHOLD` too high, or resume text failed to extract |
| Resume text is empty | The PDF is a scan; use a text-based PDF or fill the summary field manually |
| Emails not arriving | Resend domain unverified, or `RESEND_FROM` doesn't match a verified domain |
| Tailored resume link dead | Signed URLs expire after 7 days — by design |
| `row-level security` errors in cron | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong in Vercel |

---

## Open items from the original spec

These were flagged as decisions to confirm; sensible defaults are already wired in:

1. **Digest vs 20 emails** — digest is the default; `EMAIL_MODE=individual` switches it.
2. **Platform list** — editable in `src/components/PlatformPicker.tsx`.
3. **Relevance cutoff** — score-gated at 50 by default, so some days send fewer than 20.
4. **Resume format** — PDF only. DOCX would need a `docx` dependency and a second render path.
5. **Timezone** — one fixed 07:00 IST send. Per-user timezones would need a `timezone` column plus
   hourly cron that filters users whose local time is 07:00.

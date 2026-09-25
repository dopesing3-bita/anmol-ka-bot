'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { JobRun, Profile, SentJob } from '@/lib/types';

type Props = {
  profile: Profile;
  lastRun: JobRun | null;
  recentJobs: SentJob[];
  totalSent: number;
};

export default function DashboardClient({ profile, lastRun, recentJobs, totalSent }: Props) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(profile.is_active);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    setError('');
    try {
      const response = await fetch('/api/profile/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next })
      });
      if (!response.ok) throw new Error('Could not update status');
      router.refresh();
    } catch (err) {
      setIsActive(!next);
      setError(err instanceof Error ? err.message : 'Could not update status');
    }
  }

  async function runNow() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/run-now', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Run failed');
      const r = data.result;
      setMessage(`Done — ${r.jobsFound} jobs found, ${r.jobsSent} matched and sent in ${r.emailsSent} email(s). Check your inbox.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hi {(profile.full_name || '').split(' ')[0] || 'there'} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings" className="btn-secondary">Settings</Link>
          <button onClick={signOut} className="btn-secondary">Sign out</button>
        </div>
      </header>

      <section className="card mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <h2 className="text-base font-semibold text-slate-900">{isActive ? 'Agent is active' : 'Agent is paused'}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {isActive ? 'Next run: tomorrow at 7:00 AM IST.' : 'No emails will be sent while paused.'}
            </p>
          </div>
          <button
            onClick={toggleActive}
            role="switch"
            aria-checked={isActive}
            className={`relative h-7 w-12 rounded-full transition ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${isActive ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </section>

      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Last run" value={lastRun ? formatDate(lastRun.run_date) : '—'} sub={lastRun?.status ?? 'never run'} />
        <Stat label="Jobs sent (last run)" value={String(lastRun?.jobs_sent ?? 0)} sub={`${lastRun?.jobs_found ?? 0} found`} />
        <Stat label="Total jobs delivered" value={String(totalSent)} sub="all time" />
      </section>

      {lastRun?.status === 'failed' && lastRun.error && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Last run failed: {lastRun.error}</p>
      )}

      <section className="card mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Run it now</h2>
            <p className="mt-1 text-sm text-slate-500">Triggers the full pipeline for your account. Limited to once per hour, and it can take a couple of minutes.</p>
          </div>
          <button onClick={runNow} disabled={busy || !profile.onboarded} className="btn-primary">
            {busy ? 'Running…' : 'Run now'}
          </button>
        </div>
        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recently sent jobs</h2>
          <Link href="/settings" className="text-sm font-semibold text-brand-600 hover:underline">Edit profile</Link>
        </div>

        {recentJobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Nothing yet. Your first digest arrives at 7:00 AM IST — or hit &ldquo;Run now&rdquo; to try it immediately.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentJobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-900 hover:text-brand-600">
                    {job.job_title}
                  </a>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''} · {job.platform} · {formatDate(job.sent_at)}
                  </p>
                </div>
                <span className={`badge ${scoreClass(job.relevance_score ?? 0)}`}>{job.relevance_score ?? 0}% match</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs capitalize text-slate-500">{sub}</p>
    </div>
  );
}

function scoreClass(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700';
  if (score >= 65) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

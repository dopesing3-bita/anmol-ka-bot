'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TagInput from '@/components/TagInput';
import PlatformPicker from '@/components/PlatformPicker';
import type { Profile } from '@/lib/types';

const ROLE_SUGGESTIONS = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Developer',
  'Cloud Support Engineer',
  'Technical Support Associate',
  'Product Manager',
  'Data Analyst',
  'DevOps Engineer'
];

export default function OnboardingForm({ profile, mode = 'onboarding' }: { profile: Profile; mode?: 'onboarding' | 'edit' }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [roles, setRoles] = useState<string[]>(profile.job_roles ?? []);
  const [platforms, setPlatforms] = useState<string[]>(profile.preferred_platforms ?? []);
  const [years, setYears] = useState(String(profile.experience_years ?? ''));
  const [summary, setSummary] = useState(profile.experience_summary ?? '');
  const [location, setLocation] = useState(profile.location_preference ?? '');
  const [resumeStatus, setResumeStatus] = useState(
    profile.resume_file_path ? `Resume on file (${(profile.resume_text || '').length.toLocaleString()} characters parsed)` : ''
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/profile/resume', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      setResumeStatus(data.warning || `Uploaded — ${Number(data.characters_extracted).toLocaleString()} characters parsed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);

    if (!roles.length) return setError('Add at least one target role.');
    if (!platforms.length) return setError('Pick at least one platform.');

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          job_roles: roles,
          preferred_platforms: platforms,
          experience_years: Number(years || 0),
          experience_summary: summary,
          location_preference: location
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save profile');

      if (mode === 'onboarding') {
        router.push('/dashboard');
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="label" htmlFor="fullName">Full name</label>
        <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajat Manjhi" />
      </div>

      <TagInput
        label="Target job roles"
        hint="Press Enter after each role. Up to 10."
        values={roles}
        onChange={setRoles}
        placeholder="e.g. Cloud Support Engineer"
        suggestions={ROLE_SUGGESTIONS}
      />

      <PlatformPicker values={platforms} onChange={setPlatforms} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="years">Years of experience</label>
          <input id="years" type="number" min={0} max={60} step={0.5} className="input" value={years} onChange={(e) => setYears(e.target.value)} placeholder="3" />
        </div>
        <div>
          <label className="label" htmlFor="location">Location preference</label>
          <input id="location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Indore / Remote / Anywhere in India" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="summary">Short profile summary</label>
        <textarea
          id="summary"
          className="input min-h-[110px] resize-y"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="3-4 lines on your core skills, tools and the kind of role you want next."
        />
      </div>

      <div>
        <label className="label" htmlFor="resume">Resume (PDF, max 5 MB)</label>
        <input id="resume" type="file" accept="application/pdf" onChange={handleResumeUpload} disabled={uploading}
          className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-6 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-600" />
        {uploading && <p className="mt-2 text-sm text-slate-500">Uploading and parsing…</p>}
        {resumeStatus && !uploading && <p className="mt-2 text-sm text-emerald-700">{resumeStatus}</p>}
        <p className="mt-2 text-xs text-slate-500">The text is extracted server-side and used to tailor a resume for every job match.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Profile saved.</p>}

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
        {saving ? 'Saving…' : mode === 'onboarding' ? 'Finish setup' : 'Save changes'}
      </button>
    </form>
  );
}

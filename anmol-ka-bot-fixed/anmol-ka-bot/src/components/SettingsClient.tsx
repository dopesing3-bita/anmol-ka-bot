'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/components/OnboardingForm';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export default function SettingsClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setPasswordErr(error.message);
    else {
      setPasswordMsg('Password updated.');
      setPassword('');
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteErr('');
    try {
      const response = await fetch('/api/account/delete', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete account');
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : 'Could not delete account');
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
      </div>

      <section className="card mb-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Profile &amp; search preferences</h2>
        <OnboardingForm profile={profile} mode="edit" />
      </section>

      <section className="card mb-5">
        <h2 className="text-base font-semibold text-slate-900">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" className="input" value={password} minLength={8} required onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <button type="submit" className="btn-secondary">Update</button>
        </form>
        {passwordMsg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordMsg}</p>}
        {passwordErr && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{passwordErr}</p>}
      </section>

      <section className="card border-red-200">
        <h2 className="text-base font-semibold text-red-700">Delete account</h2>
        <p className="mt-1 text-sm text-slate-600">
          This permanently removes your profile, job history and stored resumes. It cannot be undone.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="confirm">Type DELETE to confirm</label>
            <input id="confirm" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          </div>
          <button onClick={deleteAccount} disabled={confirmText !== 'DELETE' || deleting} className="btn bg-red-600 text-white hover:bg-red-700">
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
        {deleteErr && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{deleteErr}</p>}
      </section>
    </main>
  );
}

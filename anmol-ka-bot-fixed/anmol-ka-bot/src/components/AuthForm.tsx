'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Account created. Check your inbox to confirm your email, then log in.');
          return;
        }
        router.push('/onboarding');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-lg font-bold text-brand-600">⚡ Anmol-Ka-Bot</Link>
        <div className="card">
          <h1 className="text-xl font-bold text-slate-900">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup ? 'Start getting tailored job matches every morning.' : 'Log in to manage your daily job agent.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <label className="label" htmlFor="fullName">Full name</label>
                <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajat Manjhi" required />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link href={isSignup ? '/login' : '/signup'} className="font-semibold text-brand-600 hover:underline">
              {isSignup ? 'Log in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

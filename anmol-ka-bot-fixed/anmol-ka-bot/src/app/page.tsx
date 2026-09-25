import Link from 'next/link';

const STEPS = [
  { title: 'Tell it what you want', body: 'Target roles, experience, preferred platforms and your resume — a two-minute setup.' },
  { title: 'It hunts every morning', body: 'Gemini searches live postings across your chosen platforms and filters out anything you have already seen.' },
  { title: 'Resumes tailored per job', body: 'Each match gets its own ATS-friendly resume rewritten for that exact posting — no fabricated experience.' },
  { title: 'One clean digest at 7 AM', body: 'Apply links, match scores, and downloadable tailored resumes. Pause any time, one click.' }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight text-brand-600">⚡ Anmol-Ka-Bot</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Log in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pb-8 pt-16 text-center">
        <span className="badge bg-brand-50 text-brand-600">Runs daily at 7:00 AM IST</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Your job hunt, on autopilot.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
          Every morning Anmol-Ka-Bot finds up to 20 open roles that match your profile, scores them,
          writes a resume tailored to each one, and emails you the lot.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3">Create free account</Link>
          <Link href="/login" className="btn-secondary px-6 py-3">I already have one</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <div key={step.title} className="card">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
              {i + 1}
            </div>
            <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Anmol-Ka-Bot · Built with Next.js, Supabase, Gemini and Resend
      </footer>
    </main>
  );
}

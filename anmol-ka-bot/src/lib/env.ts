/** Centralised env access with sane defaults and fail-fast helpers. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: () => required('GEMINI_API_KEY'),
  geminiModel: () => process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  resendApiKey: () => required('RESEND_API_KEY'),
  resendFrom: () => process.env.RESEND_FROM || 'Anmol-Ka-Bot <onboarding@resend.dev>',
  adminAlertEmail: () => process.env.ADMIN_ALERT_EMAIL || '',
  appUrl: () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  cronSecret: () => required('CRON_SECRET'),
  unsubscribeSecret: () => process.env.UNSUBSCRIBE_SECRET || required('CRON_SECRET'),
  maxJobsPerUser: () => num('MAX_JOBS_PER_USER', 20),
  relevanceThreshold: () => num('RELEVANCE_THRESHOLD', 50),
  maxUsersPerRun: () => num('MAX_USERS_PER_RUN', 100),
  userConcurrency: () => num('USER_CONCURRENCY', 5),
  emailMode: () => (process.env.EMAIL_MODE === 'individual' ? 'individual' : 'digest') as 'individual' | 'digest'
};

export const RESUME_BUCKET = 'resumes';

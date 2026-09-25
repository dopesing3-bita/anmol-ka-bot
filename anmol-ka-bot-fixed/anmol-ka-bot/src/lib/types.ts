export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  job_roles: string[];
  preferred_platforms: string[];
  experience_years: number | null;
  experience_summary: string | null;
  resume_text: string | null;
  resume_file_path: string | null;
  location_preference: string | null;
  is_active: boolean;
  onboarded: boolean;
  last_manual_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RawJob = {
  title: string;
  company: string;
  platform: string;
  url: string;
  location?: string;
  posted_date?: string;
  description_snippet?: string;
};

export type ScoredJob = RawJob & {
  job_hash: string;
  relevance_score: number;
  why_relevant: string;
  tailored_resume_markdown: string;
  tailored_resume_path?: string;
  tailored_resume_url?: string;
};

export type SentJob = {
  id: string;
  job_url: string;
  job_title: string | null;
  company: string | null;
  platform: string | null;
  location: string | null;
  relevance_score: number | null;
  why_relevant: string | null;
  tailored_resume_path: string | null;
  sent_at: string;
};

export type JobRun = {
  id: string;
  run_date: string;
  status: 'pending' | 'success' | 'failed';
  trigger: string;
  jobs_found: number;
  jobs_sent: number;
  emails_sent: number;
  error: string | null;
  created_at: string;
};

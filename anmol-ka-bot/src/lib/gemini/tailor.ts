import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { env } from '@/lib/env';
import { retry } from '@/lib/utils';
import type { Profile, RawJob } from '@/lib/types';

export type TailorResult = {
  relevance_score: number;
  why_relevant: string;
  tailored_resume_markdown: string;
};

/**
 * One Gemini call per job: scores relevance AND rewrites the resume for that posting.
 * Uses structured output so parsing never depends on prose formatting.
 */
export async function tailorResumeForJob(profile: Profile, job: RawJob): Promise<TailorResult> {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey());
  const model = genAI.getGenerativeModel({
    model: env.geminiModel(),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          relevance_score: { type: SchemaType.NUMBER, description: '0-100 fit score' },
          why_relevant: { type: SchemaType.STRING, description: '2-3 lines on why this job fits' },
          tailored_resume_markdown: { type: SchemaType.STRING, description: 'Full tailored resume in markdown' }
        },
        required: ['relevance_score', 'why_relevant', 'tailored_resume_markdown']
      }
    }
  });

  const resume = (profile.resume_text || '').slice(0, 12000);

  const prompt = `You are an expert technical recruiter and resume writer.

=== CANDIDATE RESUME (source of truth) ===
${resume || '(No resume text available — rely on the summary below.)'}

=== CANDIDATE SUMMARY ===
Name: ${profile.full_name || 'Candidate'}
Target roles: ${(profile.job_roles || []).join(', ')}
Experience: ${profile.experience_years ?? 'unspecified'} years
Summary: ${profile.experience_summary || 'Not provided'}

=== JOB POSTING ===
Title: ${job.title}
Company: ${job.company}
Platform: ${job.platform}
Location: ${job.location || 'Not specified'}
Description: ${job.description_snippet || 'Not provided'}

=== TASKS ===
1. relevance_score (0-100): how well this candidate matches this posting. Be strict — 80+ means a genuinely strong match, below 50 means a poor fit.
2. why_relevant: 2-3 lines, plain language, addressed to the candidate.
3. tailored_resume_markdown: rewrite the resume for THIS posting.

HARD RULES for the tailored resume:
- NEVER invent employers, degrees, certifications, dates or metrics that are not in the source resume. Reframing is allowed, fabrication is not.
- Mirror the posting's keywords and terminology where the candidate genuinely has that experience (ATS optimisation).
- Reorder and rewrite bullets so the most relevant achievements come first; lead bullets with strong verbs and keep any real metrics.
- Structure: "# Name", contact line, "## Professional Summary" (3-4 lines tuned to this role), "## Key Skills", "## Experience" (### Role — Company | dates, then bullets), "## Education", plus "## Projects"/"## Certifications" only if present in the source.
- Output clean markdown only. One page worth of content where possible.`;

  const text = await retry(
    async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
    { label: `gemini:tailor:${job.company}`, attempts: 3 }
  );

  return parseTailorResult(text);
}

export function parseTailorResult(text: string): TailorResult {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<TailorResult>;
    const score = Number(parsed.relevance_score);
    return {
      relevance_score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      why_relevant: String(parsed.why_relevant ?? '').trim(),
      tailored_resume_markdown: String(parsed.tailored_resume_markdown ?? '').trim()
    };
  } catch {
    console.error('[gemini] Could not parse tailoring JSON. First 300 chars:', cleaned.slice(0, 300));
    return { relevance_score: 0, why_relevant: '', tailored_resume_markdown: '' };
  }
}

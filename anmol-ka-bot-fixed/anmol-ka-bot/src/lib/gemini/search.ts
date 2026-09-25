import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { retry } from '@/lib/utils';
import type { Profile, RawJob } from '@/lib/types';

/**
 * "Crawling" step.
 * We do NOT scrape LinkedIn/Naukri/Indeed HTML (ToS + anti-bot + constant breakage).
 * Instead we use Gemini with Google Search grounding so results are live and cited.
 */
export async function findJobsForProfile(profile: Profile, target = 40): Promise<RawJob[]> {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey());
  const model = genAI.getGenerativeModel({
    model: env.geminiModel(),
    // Google Search grounding. Structured output (responseMimeType) cannot be combined
    // with tools, so we ask for JSON in the prompt and parse defensively.
    tools: [{ googleSearch: {} } as unknown as never]
  });

  const roles = profile.job_roles?.length ? profile.job_roles : ['Software Engineer'];
  const platforms = profile.preferred_platforms?.length
    ? profile.preferred_platforms
    : ['LinkedIn', 'Naukri', 'Indeed'];
  const location = profile.location_preference || 'India (including remote roles)';
  const years = profile.experience_years ?? 0;

  const prompt = `You are a job-sourcing research agent. Use Google Search to find REAL, CURRENTLY OPEN job postings.

CANDIDATE
- Target roles: ${roles.join(', ')}
- Experience: ${years} years
- Location preference: ${location}
- Profile summary: ${(profile.experience_summary || 'Not provided').slice(0, 800)}

PLATFORMS TO SEARCH (only these):
${platforms.map((p) => `- ${p}`).join('\n')}

RULES
1. Return ${target} distinct postings, spread across the platforms above.
2. Only postings that appear to be open and posted within the last 30 days.
3. "url" MUST be the direct, working job/application page you actually found in search results. Never invent, guess or shorten a URL. Never use a generic search-results page.
4. No duplicates (same company + same role counts as a duplicate).
5. Match the seniority to ${years} years of experience.
6. If you cannot find ${target}, return fewer — quality over quantity.

OUTPUT
Return ONLY a JSON array, no markdown fences, no commentary, in exactly this shape:
[
  {
    "title": "string",
    "company": "string",
    "platform": "one of the platforms listed above",
    "url": "https://direct-link-to-posting",
    "location": "string",
    "posted_date": "string, e.g. '3 days ago' or '2026-09-20'",
    "description_snippet": "2-4 sentences covering key responsibilities and required skills"
  }
]`;

  const text = await retry(
    async () => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
      });
      return result.response.text();
    },
    { label: 'gemini:job-search', attempts: 3 }
  );

  return sanitiseJobs(parseJsonArray(text), platforms);
}

/** Gemini sometimes wraps JSON in prose or fences — pull the array out regardless. */
export function parseJsonArray(text: string): unknown[] {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  const candidate = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('[gemini] Could not parse job JSON. First 400 chars:', cleaned.slice(0, 400));
    return [];
  }
}

function sanitiseJobs(items: unknown[], platforms: string[]): RawJob[] {
  const seen = new Set<string>();
  const jobs: RawJob[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const job = item as Record<string, unknown>;
    const title = String(job.title ?? '').trim();
    const company = String(job.company ?? '').trim();
    const url = String(job.url ?? '').trim();

    if (!title || !company || !isHttpUrl(url)) continue;

    const key = `${title.toLowerCase()}@${company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    jobs.push({
      title,
      company,
      url,
      platform: String(job.platform ?? '').trim() || platforms[0],
      location: String(job.location ?? '').trim() || undefined,
      posted_date: String(job.posted_date ?? '').trim() || undefined,
      description_snippet: String(job.description_snippet ?? '').trim().slice(0, 1500) || undefined
    });
  }

  return jobs;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

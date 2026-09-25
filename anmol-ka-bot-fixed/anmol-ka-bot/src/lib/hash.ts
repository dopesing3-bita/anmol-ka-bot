import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** Stable de-dup hash for a job posting. */
export function jobHash(url: string, title: string, company: string): string {
  const normalised = [normaliseUrl(url), title.trim().toLowerCase(), company.trim().toLowerCase()].join('|');
  return createHash('sha256').update(normalised).digest('hex');
}

/** Strip tracking params and trailing slashes so the same job doesn't look new. */
export function normaliseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const strip = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'refId', 'trackingId', 'trk'];
    strip.forEach((key) => parsed.searchParams.delete(key));
    parsed.hash = '';
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function signToken(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyToken(payload: string, token: string, secret: string): boolean {
  const expected = signToken(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(token || '');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

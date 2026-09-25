/** Run tasks with bounded concurrency (keeps Gemini/Resend rate limits happy). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

/** Retry with exponential backoff — used around every external API call. */
export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 800, label = 'operation' }: { attempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 250;
      console.warn(`[retry] ${label} failed (attempt ${attempt}/${attempts}), retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Token budgeting helpers.
 *
 * The free Groq tier caps us at 12k tokens-per-minute (TPM). Without
 * discipline we blow past that on a single multi-step run. These helpers
 * give us three knobs:
 *
 *   1. `approxTokens` — a cheap heuristic so we can measure prompt size
 *      before we commit to sending it (~4 chars per token for Arabic+JSON).
 *   2. `truncate`     — cap any large string to a target token budget
 *      while keeping head + tail context.
 *   3. `TpmLimiter`   — an in-memory rolling-window counter so we throw
 *      a friendly error *before* Groq returns 429.
 *
 * Numbers are intentionally conservative; Groq counts a bit higher than
 * our estimate, but it's better to under-fill than to overflow.
 */

const CHARS_PER_TOKEN = 4

/** Rough token estimate. Off by ~10-15% but plenty good for budgeting. */
export function approxTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Truncate a string to roughly `maxTokens` tokens. If we have to cut, we
 * keep the first ~70% from the head and ~30% from the tail so the model
 * still sees the most important context (header/schema + last results).
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const limit = maxTokens * CHARS_PER_TOKEN
  if (text.length <= limit) return text
  const headLen = Math.floor(limit * 0.7)
  const tailLen = limit - headLen - 32 // reserve room for the marker
  return (
    text.slice(0, headLen) +
    `\n…[تم اقتطاع ${text.length - limit} حرف لتوفير التوكنز]…\n` +
    text.slice(-tailLen)
  )
}

/**
 * Truncate a tool result before feeding it back to the model. We keep the
 * full row in our DB log (for the dashboard), but the model only needs a
 * summary. Caller passes the JSON-stringified result.
 */
export function truncateToolResultForModel(json: string, maxTokens = 800): string {
  return truncateToTokens(json, maxTokens)
}

// --- TPM limiter -----------------------------------------------------------

/**
 * Rolling 60-second token counter shared across all agent runs in this
 * Node process. Not perfect for multi-instance deployments, but good
 * enough to soften 429s on a single server.
 */
class TpmLimiter {
  private events: { ts: number; tokens: number }[] = []
  constructor(private readonly limit: number) {}

  /** Drop entries older than 60s. */
  private prune() {
    const cutoff = Date.now() - 60_000
    while (this.events.length && this.events[0].ts < cutoff) this.events.shift()
  }

  /** Total tokens consumed in the last 60s. */
  used(): number {
    this.prune()
    return this.events.reduce((s, e) => s + e.tokens, 0)
  }

  /** Tokens still available right now. */
  remaining(): number {
    return Math.max(0, this.limit - this.used())
  }

  /** Reserve `tokens`; throws if it would exceed the limit. */
  reserve(tokens: number): void {
    this.prune()
    if (this.used() + tokens > this.limit) {
      const wait = Math.ceil(
        (60_000 - (Date.now() - this.events[0]!.ts)) / 1000,
      )
      throw new Error(
        `حد التوكنز/دقيقة (${this.limit}) قريب من الامتلاء. حاول مجدداً بعد ~${wait}ث.`,
      )
    }
    this.events.push({ ts: Date.now(), tokens })
  }
}

// Groq free tier: 12k TPM. Leave 10% headroom for safety.
export const groqTpm = new TpmLimiter(10_800)

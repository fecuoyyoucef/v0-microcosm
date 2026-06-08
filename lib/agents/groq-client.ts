/**
 * Groq API client.
 *
 * We talk to Groq directly via fetch instead of pulling in the `groq-sdk`
 * package, which keeps cold starts fast and gives us full control over
 * retries, timeouts, and API-key rotation. The wire format is OpenAI-
 * compatible so any code that used to talk to OpenAI will feel familiar.
 *
 * Multi-key rotation: when `GROQ_API_KEYS` (comma separated) is set we cycle
 * through them on 429 / rate-limit errors. This lets the platform tolerate
 * burst traffic from many agents without a paid tier. Single-key setups
 * still work via `GROQ_API_KEY`.
 */

import type { ChatMessage, GroqModel, ToolCall, ToolDefinition } from "./types"

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

interface ChatCompletionRequest {
  model: GroqModel
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  tool_choice?: "auto" | "none" | "required"
  temperature?: number
  max_tokens?: number
  top_p?: number
  response_format?: { type: "json_object" }
  stream?: false
}

export interface ChatCompletionResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | string
    message: {
      role: "assistant"
      content: string | null
      tool_calls?: ToolCall[]
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class GroqError extends Error {
  constructor(
    message: string,
    public status: number,
    public retriable: boolean,
  ) {
    super(message)
    this.name = "GroqError"
  }
}

function getKeys(): string[] {
  const multi = process.env.GROQ_API_KEYS
  if (multi) {
    return multi
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  }
  const single = process.env.GROQ_API_KEY
  if (single) return [single]
  return []
}

let cursor = 0
function nextKey(keys: string[]): string {
  const key = keys[cursor % keys.length]
  cursor++
  return key
}

async function callOnce(
  body: ChatCompletionRequest,
  apiKey: string,
  signal: AbortSignal,
): Promise<ChatCompletionResponse> {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    // 429, 500, 502, 503 are worth retrying; 4xx auth errors are not.
    const retriable = res.status === 429 || res.status >= 500
    throw new GroqError(`Groq ${res.status}: ${text}`, res.status, retriable)
  }

  return (await res.json()) as ChatCompletionResponse
}

/**
 * Call Groq with automatic retry, key rotation, and timeout.
 * Throws GroqError on unrecoverable failures.
 */
export async function chatCompletion(
  body: ChatCompletionRequest,
  opts: { timeoutMs?: number; maxRetries?: number } = {},
): Promise<ChatCompletionResponse> {
  const keys = getKeys()
  if (keys.length === 0) {
    throw new GroqError("GROQ_API_KEY is not configured", 500, false)
  }

  const timeoutMs = opts.timeoutMs ?? 60_000
  const maxRetries = opts.maxRetries ?? 3

  let lastError: GroqError | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const key = nextKey(keys)
      const result = await callOnce(body, key, controller.signal)
      return result
    } catch (err) {
      const groqErr =
        err instanceof GroqError
          ? err
          : new GroqError(
              err instanceof Error ? err.message : String(err),
              0,
              true,
            )
      lastError = groqErr
      console.error(
        `[agents] Groq call failed (attempt ${attempt + 1}/${maxRetries}):`,
        groqErr.status,
        groqErr.message,
      )
      if (!groqErr.retriable) break
      // Exponential backoff: 250ms, 500ms, 1000ms
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt))
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError ?? new GroqError("Groq call failed for unknown reason", 500, false)
}

export { GroqError }

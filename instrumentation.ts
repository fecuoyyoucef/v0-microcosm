import * as Sentry from "@sentry/nextjs"

// Next.js calls register() once per runtime (node / edge). We forward to the
// matching Sentry config file so both server-side and edge-side errors are
// captured.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Surfaces request-level errors from Server Components, Server Actions and
// Route Handlers to Sentry — without this Next swallows them silently.
export const onRequestError = Sentry.captureRequestError

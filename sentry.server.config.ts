import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Lower in production to control event volume / cost.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Surfaces uncaught exceptions in dev too — invaluable while debugging.
  debug: false,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
})

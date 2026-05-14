import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

// Only wrap with Sentry when a DSN is configured. This lets the project
// build cleanly in environments (like v0 preview) where Sentry isn't set up.
const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      // Sentry build-time options. Org/project come from env so they can be
      // overridden per environment without code changes.
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      // Forwards browser /monitoring requests through Next to bypass ad
      // blockers that would otherwise drop client error reports.
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig

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

// withSentryConfig injects a webpack plugin. The build script uses
// `next build --webpack` (see package.json) so this is compatible.
// Dev still uses Turbopack for fast HMR — Sentry runtime SDK works
// in dev too, only the build-time source map upload requires webpack.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Tunnel Sentry requests through /monitoring to bypass ad blockers.
  tunnelRoute: "/monitoring",
  disableLogger: true,
  // Skip source map upload when auth token isn't configured (e.g. previews).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
})

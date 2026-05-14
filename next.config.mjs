/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Empty turbopack config silences Next 16's warning about a webpack config
  // without a matching turbopack config. We no longer wrap with
  // withSentryConfig because its injected webpack plugin crashes the
  // Turbopack build worker ("Call retries were exceeded").
  turbopack: {},
}

export default nextConfig

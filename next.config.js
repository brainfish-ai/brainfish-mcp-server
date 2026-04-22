/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node-fetch'],
  turbopack: {
    root: import.meta.dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig

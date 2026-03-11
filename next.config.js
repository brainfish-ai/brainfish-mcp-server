/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node-fetch'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig

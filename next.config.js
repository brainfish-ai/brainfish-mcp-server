/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  turbopack: {
    root: import.meta.dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig

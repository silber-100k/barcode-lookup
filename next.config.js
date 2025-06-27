/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.barcodelookup.com'],
  },
}

module.exports = nextConfig 
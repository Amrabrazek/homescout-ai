/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'picsum.photos',
      'eztjeqhcgupkxfmczgfw.supabase.co',
      'localhost',
      '127.0.0.1',
      'images.unsplash.com',
    ],
  },
  env: {
    GRAPHQL_ENDPOINT:
      process.env.GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets Next.js resolve @health/schemas from the monorepo
  // packages folder without a build step during development.
  transpilePackages: ['@health/schemas'],

  // Backend API is at 4000, Next.js dev server is at 3000.
  // All /api/backend/* calls are proxied to avoid CORS in dev.
  async rewrites() {
    return {
      beforeFiles: [ 
        {
          source: '/api/backend/:path*',
          destination: 'http://localhost:4000/api/:path*',
        },
      ],
    };
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
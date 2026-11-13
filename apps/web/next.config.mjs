/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hbms/shared'],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;


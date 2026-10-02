import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@harness/agent',
    '@harness/schema',
    '@harness/stellar-tools',
    '@harness/storage',
  ],
  devIndicators: false,
};

export default nextConfig;

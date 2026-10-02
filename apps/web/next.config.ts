import { join } from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@harness/agent',
    '@harness/schema',
    '@harness/stellar-tools',
    '@harness/storage',
  ],
  outputFileTracingRoot: join(import.meta.dirname, '../..'),
  outputFileTracingIncludes: {
    '/api/**': ['../../data/public/**'],
    '/findings': ['../../data/public/**'],
  },
  devIndicators: false,
};

export default nextConfig;

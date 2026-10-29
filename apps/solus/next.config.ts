import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  // The Content-Security-Policy (with a per-request nonce) is set in src/proxy.ts.
  async headers() {
    return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;

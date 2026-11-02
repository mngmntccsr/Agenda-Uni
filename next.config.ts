import type { NextConfig } from 'next';
const base='/uni.agenda';
const nextConfig: NextConfig = { reactStrictMode:true, output:'export', basePath:base, images:{unoptimized:true}, env:{NEXT_PUBLIC_BASE_PATH:base} };
export default nextConfig;

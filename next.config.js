/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    domains: ['images.pexels.com', 'via.placeholder.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Ignore the critical dependency warnings from @supabase/realtime-js
    config.ignoreWarnings = [
      { message: /Critical dependency: the request of a dependency is an expression/ }
    ];
    
    return config;
  },
};

module.exports = nextConfig;

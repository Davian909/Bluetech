import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  experimental: {
    webpackMemoryOptimizations: true,
    cpus: 1,
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Hemat RAM di laptop 4 GB: hindari alokasi ArrayBuffer besar dari PackFileCacheStrategy & source map dev
      config.cache = false;
      config.devtool = false;
    }
    return config;
  },
};

export default nextConfig;

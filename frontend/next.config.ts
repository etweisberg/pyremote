import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL || "https://api.example.com",
  },
};

export default nextConfig;

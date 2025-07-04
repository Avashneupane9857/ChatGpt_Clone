import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 
 images: {
    domains: ['res.cloudinary.com'], // if using Cloudinary
    // Allow data URLs for base64 images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  }, eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray lockfile lives in $HOME).
  turbopack: { root: __dirname },
  // Static export → pure HTML/CSS/JS served by nginx. No server runtime.
  output: "export",
  // next/image optimization needs a server; disable for static export.
  images: { unoptimized: true },
  // Emit /route/index.html so nginx can serve clean URLs with simple try_files.
  trailingSlash: true,
  // The 3D / editor bundles are large by nature; keep production source maps off.
  productionBrowserSourceMaps: false,
};

export default nextConfig;

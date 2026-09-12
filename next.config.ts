import type { NextConfig } from "next";

const isStatic = process.env.PACT_STATIC === "1";
const basePath = process.env.PACT_BASE_PATH || "";

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      ...(basePath ? { basePath, assetPrefix: basePath } : {}),
    }
  : {
      images: {
        remotePatterns: [
          { protocol: "https", hostname: "images.unsplash.com" },
          { protocol: "https", hostname: "i.ytimg.com" },
          { protocol: "https", hostname: "wger.de" },
        ],
      },
    };

export default nextConfig;

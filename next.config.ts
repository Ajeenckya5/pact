import type { NextConfig } from "next";
import path from "node:path";

const isStatic = process.env.PACT_STATIC === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.PACT_BASE_PATH || "";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  turbopack: {
    resolveAlias: {
      sharp: { browser: "" },
      "onnxruntime-node": { browser: "" },
      "@pact/core": "./packages/core/src/index.ts",
      "@pact/engine": "./packages/engine/src/index.ts",
      "@pact/ui": "./packages/ui-tokens/src/index.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
      "@pact/core": path.join(process.cwd(), "packages/core/src/index.ts"),
      "@pact/engine": path.join(process.cwd(), "packages/engine/src/index.ts"),
      "@pact/ui": path.join(process.cwd(), "packages/ui-tokens/src/index.ts"),
    };
    return config;
  },
  ...(isStatic
    ? {
        output: "export" as const,
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
      }),
};

export default nextConfig;

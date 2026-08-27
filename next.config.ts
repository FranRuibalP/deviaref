import type { NextConfig } from "next";

// Si tu repositorio se llama "devref":
const repoName = "deviaref";

const nextConfig: NextConfig = {
  output: "export",
  // Agrega la subruta cuando compila para producción
  basePath: process.env.NODE_ENV === "production" ? `/${repoName}` : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// En GitHub Pages el sitio vive en /fit-evolution/, así que el build
// de producción usa esa ruta base (GITHUB_PAGES=true pnpm build)
const basePath = process.env.GITHUB_PAGES === "true" ? "/fit-evolution" : "";

const nextConfig: NextConfig = {
  // Exportación estática: la app es 100% cliente, no necesita servidor
  output: "export",
  trailingSlash: true,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;

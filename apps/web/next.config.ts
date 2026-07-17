import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, '../..');

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo: el lockfile vive en la raíz (dos niveles arriba de apps/web),
    // no en este paquete — hay que decírselo explícito o Turbopack se pierde
    // intentando inferirlo.
    root: monorepoRoot,
  },
  // Build de producción (Docker, forge02): imagen liviana que no necesita
  // node_modules completo. En monorepo el tracing por defecto solo ve este
  // paquete — outputFileTracingRoot lo apunta a la raíz para que incluya lo
  // necesario del workspace (mismo motivo que turbopack.root arriba).
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo: el lockfile vive en la raíz (dos niveles arriba de apps/web),
    // no en este paquete — hay que decírselo explícito o Turbopack se pierde
    // intentando inferirlo.
    root: path.resolve(__dirname, '../..'),
  },
};

export default nextConfig;

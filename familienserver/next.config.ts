import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Nur für `npm run dev`: API-Anfragen an das lokal laufende Flask-Backend weiterreichen.
const backendUrl = process.env.FAMILIENSERVER_BACKEND_URL || "http://127.0.0.1:5000";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // Im Betrieb wird die Seite statisch nach out/ exportiert und von Flask ausgeliefert –
    // ein Prozess, ein Port, kein Node.js auf dem Raspberry Pi nötig.
    output: isDev ? undefined : "export",
    ...(isDev && {
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
      },
    }),
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}

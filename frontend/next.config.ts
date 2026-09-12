import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (Next 16) queda explícitamente DESACTIVADO —
  // decisión consciente, no un olvido. Nuestra auth es JWT manejado
  // por el cliente (con rotación de refresh tokens, no cookies de
  // sesión), y necesitamos datos siempre frescos en el panel admin y
  // el catálogo (stock/precio cambian seguido) — el modelo "previo"
  // (fetch con cache:'no-store' explícito en lib/api/client.ts) es
  // más simple y evita tener que decorar cada componente con 'use
  // cache' + límites de Suspense en pantallas que igual necesitan ser
  // dinámicas por request. Ver docs/ARCHITECTURE.md para más contexto
  // de por qué la auth no es cookie-based.
};

export default nextConfig;


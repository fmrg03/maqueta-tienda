import type { Metadata } from "next";

// El acceso es solo para el personal: no debe aparecer en buscadores.
export const metadata: Metadata = {
  title: "Acceso al panel — Revestimiento Élite RY",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

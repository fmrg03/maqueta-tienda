import { PanelShell } from "@/components/panel/PanelShell";

export const metadata = { title: "Panel — Revestimiento Élite RY", robots: { index: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}

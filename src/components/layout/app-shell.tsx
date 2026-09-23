"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// El asistente es un botón flotante: no hace falta para el primer pintado,
// así que su código se descarga aparte y no pesa en la carga inicial.
const AiChatWidget = dynamic(
  () => import("@/components/ui/ai-chat-widget").then((m) => m.AiChatWidget),
  { ssr: false },
);

type AppShellProps = {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
};

export function AppShell({ children, header, footer }: AppShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute =
    pathname.startsWith("/portal-clientes") || pathname.startsWith("/portal-comercial");

  if (isAdminRoute || isPortalRoute) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {header}
      <div className="flex-1">{children}</div>
      {footer}
      <AiChatWidget />
    </div>
  );
}

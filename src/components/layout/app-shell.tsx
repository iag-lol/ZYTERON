"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { MotionObserver } from "./motion-observer";

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
  const isAdminRoute = pathname.startsWith("/administracion");
  const isPortalRoute =
    pathname.startsWith("/clientes") || pathname.startsWith("/portal-comercial");

  if (isAdminRoute || isPortalRoute || pathname === "/boletas/consulta") {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="public-site flex min-h-screen flex-col">
      {header}
      {/* La clave por ruta hace que cada navegación salga y entre con una
          transición de vista; el encabezado queda anclado (site-header). */}
      <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
        <div className="flex-1">{children}</div>
      </ViewTransition>
      {footer}
      <MotionObserver />
      {!["/contacto", "/cotizador", "/becas-web-pyme"].some(
        (route) => pathname === route || pathname.startsWith(route + "/"),
      ) && <AiChatWidget />}
    </div>
  );
}

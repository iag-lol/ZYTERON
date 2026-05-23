import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const PORTAL_CLIENTES_URL = "/portal-clientes";

type PortalAccessLinkProps = {
  className?: string;
  size?: "sm" | "md";
  label?: string;
  onClick?: () => void;
};

export function PortalAccessLink({
  className,
  size = "md",
  label = "Portal clientes",
  onClick,
}: PortalAccessLinkProps) {
  return (
    <Link
      href={PORTAL_CLIENTES_URL}
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center overflow-hidden rounded-lg border font-semibold transition-all duration-200",
        "border-blue-400/25 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white",
        "shadow-md shadow-blue-950/25 hover:border-blue-300/40 hover:shadow-lg hover:shadow-blue-900/35",
        size === "sm" ? "gap-1.5 px-3 py-1.5 text-xs" : "gap-2 px-3.5 py-2 text-sm",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(96,165,250,0.18)_50%,transparent_80%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <ShieldCheck
        className={cn("relative shrink-0 text-blue-200", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
      />
      <span className="relative whitespace-nowrap">{label}</span>
    </Link>
  );
}

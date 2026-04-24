"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const SESSION_KEY = "zyteron_web_session_id";

function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

export function WebVisitTracker() {
  const pathname = usePathname();
  const trackedRef = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    const query = typeof window !== "undefined" ? window.location.search : "";
    const fullPath = `${pathname}${query || ""}`;
    if (!fullPath || fullPath.startsWith("/admin")) return;
    if (trackedRef.current === fullPath) return;
    trackedRef.current = fullPath;

    const sessionId = getOrCreateSessionId();
    const body = JSON.stringify({
      path: fullPath,
      pageTitle: typeof document !== "undefined" ? document.title : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      sessionId,
    });

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // silenciar para no afectar UX.
    });
  }, [pathname]);

  return null;
}

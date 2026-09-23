"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  isExcludedWebVisitPath,
  normalizeWebVisitPath,
  sanitizeWebVisitReferrer,
} from "@/lib/analytics/visit-privacy";

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
    const trackedPath = normalizeWebVisitPath(pathname);
    if (!trackedPath || isExcludedWebVisitPath(trackedPath)) return;
    if (trackedRef.current === trackedPath) return;
    trackedRef.current = trackedPath;

    const sessionId = getOrCreateSessionId();
    const body = JSON.stringify({
      path: trackedPath,
      pageTitle: typeof document !== "undefined" ? document.title : "",
      referrer:
        typeof document !== "undefined" ? sanitizeWebVisitReferrer(document.referrer) : "",
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

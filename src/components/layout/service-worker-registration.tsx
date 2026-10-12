"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (decision 072) in production builds only: in
 * development it would cache build files that hot reload keeps replacing.
 * updateViaCache "none" makes every update check reach the server.
 */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        // The app works without it; installing and the offline page do not.
        console.error("Service worker registration failed", error);
      });
  }, []);

  return null;
}

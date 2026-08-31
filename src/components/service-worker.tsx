"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker minimal de `public/sw.js`.
 * Rendu par le layout racine, ne dessine rien.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[sw] enregistrement impossible", error);
    });
  }, []);

  return null;
}

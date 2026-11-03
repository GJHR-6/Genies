"use client";

import { useEffect } from "react";

/**
 * Instala el service worker (public/sw.js) para que el inventario de hoy
 * abra sin internet, y le pasa la pantalla y los archivos que ya se
 * cargaron. Solo en producción: en desarrollo la copia estorba.
 */
export function ModoSinInternet() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let cancelado = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registro) => {
        if (cancelado) return;
        const archivos = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => new URL(u).pathname.startsWith("/_next/static/"));
        registro.active?.postMessage({
          tipo: "guardar",
          urls: [window.location.pathname, ...archivos],
        });
      })
      .catch(() => {
        /* sin service worker: la página igual funciona con internet */
      });
    return () => {
      cancelado = true;
    };
  }, []);
  return null;
}

/** Borra la copia guardada (al llegar al login después de salir). */
export function olvidarCopiaSinInternet() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ tipo: "olvidar" });
    void caches?.delete("genies-v1");
  } catch {
    /* nada que borrar */
  }
}

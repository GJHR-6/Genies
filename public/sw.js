/*
 * Service worker de Genies (modo sin internet, nov 2026).
 *
 * Solo sirve para que "Inventario de hoy" (/captura) abra aunque se caiga
 * el internet en la tienda:
 *  - /captura: primero la red; si no hay, la última copia guardada.
 *  - Archivos de la app (/_next/static, llevan hash): de la copia si existe.
 *  - Logo e íconos: la copia al instante y se renueva por detrás.
 * Lo que se anota sin internet lo guarda la página en la tablet
 * (src/lib/cola-offline.ts), no este archivo.
 */

const CACHE = "genies-v1";
const PAGINA = "/captura";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre !== CACHE) await caches.delete(nombre);
      }
      await self.clients.claim();
    })()
  );
});

const SIN_INTERNET = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin internet</title>
<style>body{font-family:system-ui,sans-serif;background:#fdf8f3;color:#3b2a20;margin:0;padding:32px 16px;text-align:center}
a{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:8px;background:#b5654a;color:#fff;text-decoration:none;font-weight:600}
@media (prefers-color-scheme:dark){body{background:#1f1814;color:#f3e9e1}}</style></head>
<body><h1>Sin internet</h1><p>Esta pantalla necesita internet. El inventario de hoy sí se puede anotar sin señal.</p>
<a href="${PAGINA}">Ir al inventario de hoy</a></body></html>`;

function sinInternet() {
  return new Response(SIN_INTERNET, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Solo se guarda la pantalla de verdad, no una redirección al login. */
function esPaginaValida(respuesta) {
  return (
    respuesta.ok &&
    !respuesta.redirected &&
    new URL(respuesta.url).pathname === PAGINA
  );
}

async function navegar(pedido) {
  const ruta = new URL(pedido.url).pathname;
  try {
    const respuesta = await fetch(pedido);
    if (ruta === PAGINA && esPaginaValida(respuesta)) {
      const cache = await caches.open(CACHE);
      await cache.put(PAGINA, respuesta.clone());
    }
    return respuesta;
  } catch {
    if (ruta === PAGINA || ruta === "/") {
      const copia = await caches.match(PAGINA);
      if (copia) return copia;
    }
    return sinInternet();
  }
}

async function primeroCopia(pedido) {
  const copia = await caches.match(pedido);
  if (copia) return copia;
  const respuesta = await fetch(pedido);
  if (respuesta.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(pedido, respuesta.clone());
  }
  return respuesta;
}

async function copiaYRenovar(pedido) {
  const cache = await caches.open(CACHE);
  const copia = await cache.match(pedido);
  const red = fetch(pedido)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(pedido, respuesta.clone());
      return respuesta;
    })
    .catch(() => copia ?? Response.error());
  return copia ?? red;
}

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === "navigate") {
    evento.respondWith(navegar(pedido));
  } else if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(primeroCopia(pedido));
  } else if (
    url.pathname.startsWith("/_next/image") ||
    /\.(?:png|jpe?g|svg|ico|webp)$/.test(url.pathname)
  ) {
    evento.respondWith(copiaYRenovar(pedido));
  }
});

// La página pide guardar los archivos que ya cargó antes de que este
// worker la controlara (la primera visita).
self.addEventListener("message", (evento) => {
  const datos = evento.data;
  if (!datos || datos.tipo !== "guardar" || !Array.isArray(datos.urls)) return;
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const u of datos.urls) {
        try {
          const url = new URL(u, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          if (url.pathname === PAGINA) {
            const respuesta = await fetch(url, { credentials: "same-origin" });
            if (esPaginaValida(respuesta)) await cache.put(PAGINA, respuesta);
          } else if (!(await cache.match(url))) {
            await cache.add(url);
          }
        } catch {
          /* sin internet o archivo que ya no existe: se intenta en la próxima visita */
        }
      }
    })()
  );
});

// Al salir de la cuenta: borrar la copia de la pantalla.
self.addEventListener("message", (evento) => {
  if (evento.data && evento.data.tipo === "olvidar") {
    evento.waitUntil(caches.delete(CACHE));
  }
});

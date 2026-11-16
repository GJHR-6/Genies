import type { ClaveHoy } from "@/lib/grupos";

export type EstadoDelDia = {
  esDomingo: boolean;
  tiendasTotal: number;
  tiendasCerradas: number;
};

export type PasoDelDia = {
  /** Pantalla que conviene abrir ahora (se resalta en la portada). */
  destacada: ClaveHoy | null;
  titulo: string;
  mensaje: string;
  tono: "info" | "aviso" | "exito";
};

/**
 * Qué le conviene hacer a la administración ahora, en lenguaje simple.
 * Es solo una sugerencia: todas las pantallas se pueden abrir siempre.
 */
export function pasoDelDia(e: EstadoDelDia): PasoDelDia {
  if (e.esDomingo) {
    return {
      destacada: null,
      titulo: "Hoy es domingo",
      mensaje: "No hay producción. Podés revisar los catálogos o el historial.",
      tono: "info",
    };
  }

  const faltan = e.tiendasTotal - e.tiendasCerradas;
  if (faltan > 0) {
    return {
      destacada: "tiendas",
      titulo:
        faltan === 1
          ? "Falta 1 tienda por terminar su inventario"
          : `Faltan ${faltan} tiendas por terminar su inventario`,
      mensaje:
        "Cuando todas terminen, los sugeridos y los cuadros quedan completos. Si ya no van a cambiar nada, podés cerrarles el día vos.",
      tono: "aviso",
    };
  }

  return {
    destacada: "cuadros",
    titulo: "Todas las tiendas terminaron",
    mensaje:
      "Revisá los sugeridos, completá el cuadro completo (DECO, SIN DECO y las batidas) e imprimí las hojas para cocina y empaque.",
    tono: "exito",
  };
}

/** Saludo según la hora de Tegucigalpa. */
export function saludo(fecha: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Tegucigalpa",
    }).format(fecha)
  );
  if (hora < 12) return "Buenos días";
  if (hora < 18) return "Buenas tardes";
  return "Buenas noches";
}

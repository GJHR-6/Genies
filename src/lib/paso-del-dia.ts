import type { ClaveHoy } from "@/lib/grupos";

export type EstadoDelDia = {
  esDomingo: boolean;
  tiendasTotal: number;
  tiendasCerradas: number;
  /** null = todavía no se generó el reparto de hoy. */
  reparto: "borrador" | "publicado" | null;
  unidadesHechas: number;
  unidadesTotal: number;
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

  if (e.reparto === null) {
    return {
      destacada: "sugeridos",
      titulo: "Todas las tiendas terminaron",
      mensaje:
        "Revisá los sugeridos, imprimí los cuadros y después repartí el trabajo entre las pasteleras.",
      tono: "exito",
    };
  }

  if (e.reparto === "borrador") {
    return {
      destacada: "reparto",
      titulo: "El reparto está listo pero no se ha enviado",
      mensaje:
        "Revisalo y tocá «Enviar a cocina» para que las pasteleras lo vean en la tablet.",
      tono: "aviso",
    };
  }

  const terminado = e.unidadesTotal > 0 && e.unidadesHechas >= e.unidadesTotal;
  return {
    destacada: terminado ? null : "reparto",
    titulo: terminado ? "¡La producción de hoy está terminada!" : "La cocina está trabajando",
    mensaje: terminado
      ? "Todas las pasteleras marcaron su trabajo como listo."
      : `Llevan ${e.unidadesHechas} de ${e.unidadesTotal} unidades. El avance se actualiza solo.`,
    tono: terminado ? "exito" : "info",
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

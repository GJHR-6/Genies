/**
 * Batidas (reunión 16 oct y mensaje del 21 oct 2026).
 *
 * En el Excel de la dueña, las columnas DEC y PROD dicen cuánto se decora
 * y cuánto se hornea de cada producto en cada batida, separadas por "*":
 * "39*2" = 39 en la primera batida y 2 en la segunda. En la app cada
 * batida es una tanda del reparto (T1–T4).
 *
 * Los pasteles que se controlan por libras (vainilla, chocolate, mixto…)
 * tienen `productos.libras` = libras de masa por unidad. Se suman las
 * libras de lo que se hornea de cada masa (la categoría del producto) en
 * cada batida; una batida no puede pasar de 100 lb.
 */

export const MAX_LIBRAS_BATIDA = 100;
export const NUM_TANDAS = 4;

/** Cantidades por tanda (índice 0 = T1) → "39*2", "0*10", "4" o "". */
export function formatoTandas(cantidades: readonly number[]): string {
  let ultima = -1;
  cantidades.forEach((c, i) => {
    if (c > 0) ultima = i;
  });
  if (ultima < 0) return "";
  return cantidades.slice(0, ultima + 1).join("*");
}

type Asignacion = {
  producto_id: number;
  tipo: "produccion" | "decoracion";
  tanda: number;
  cantidad: number;
};

/** Por producto: cantidades por tanda de un tipo (sumando pasteleras). */
export function tandasPorProducto(
  asignaciones: readonly Asignacion[],
  tipo: Asignacion["tipo"]
): Map<number, number[]> {
  const resultado = new Map<number, number[]>();
  for (const a of asignaciones) {
    if (a.tipo !== tipo || a.tanda < 1 || a.tanda > NUM_TANDAS) continue;
    let fila = resultado.get(a.producto_id);
    if (!fila) {
      fila = Array(NUM_TANDAS).fill(0);
      resultado.set(a.producto_id, fila);
    }
    fila[a.tanda - 1] += a.cantidad;
  }
  return resultado;
}

export type BatidasMasa = {
  /** La masa: categoría del producto (VAINILLA, CHOCOLATE, MIXTO…). */
  masa: string;
  /** Libras por tanda (índice 0 = T1), redondeadas a 2 decimales. */
  libras: number[];
  /** Tandas (1–4) que pasan del máximo. */
  excedidas: number[];
};

/**
 * Libras por batida de cada masa, con lo que se hornea (producción).
 * Solo cuentan los productos con libras; las masas sin libras no salen.
 * El orden de las masas es el de la lista de productos (orden del Excel).
 */
export function librasPorBatida(
  asignaciones: readonly Asignacion[],
  productos: readonly {
    id: number;
    categoria: string | null;
    libras: number | null;
  }[],
  maximo = MAX_LIBRAS_BATIDA
): BatidasMasa[] {
  const porProducto = tandasPorProducto(asignaciones, "produccion");
  const masas = new Map<string, number[]>();
  for (const p of productos) {
    if (p.libras === null || !(p.libras > 0)) continue;
    const masa = p.categoria ?? "OTROS";
    let libras = masas.get(masa);
    if (!libras) {
      libras = Array(NUM_TANDAS).fill(0);
      masas.set(masa, libras);
    }
    const tandas = porProducto.get(p.id);
    if (!tandas) continue;
    tandas.forEach((c, i) => {
      libras[i] += c * p.libras!;
    });
  }
  return [...masas].map(([masa, libras]) => {
    const redondeadas = libras.map((l) => Math.round(l * 100) / 100);
    return {
      masa,
      libras: redondeadas,
      excedidas: redondeadas
        .map((l, i) => (l > maximo ? i + 1 : 0))
        .filter((t) => t > 0),
    };
  });
}

/** "84*60 lb" (hasta la última tanda con libras) o "". */
export function formatoLibras(libras: readonly number[]): string {
  const texto = formatoTandas(libras.map((l) => Math.round(l * 10) / 10));
  return texto ? `${texto} lb` : "";
}

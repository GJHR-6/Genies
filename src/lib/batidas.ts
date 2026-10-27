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

/** Casilla de DEC o PROD cambiada a mano en el cuadro completo. */
export type AjusteBatida = {
  producto_id: number;
  tipo: "produccion" | "decoracion";
  tanda: number;
  cantidad: number;
};

/** Clave de una casilla: `${productoId}-${tipo}-${tanda}`. */
export const claveBatida = (
  productoId: number,
  tipo: AjusteBatida["tipo"],
  tanda: number
) => `${productoId}-${tipo}-${tanda}`;

/**
 * DEC y PROD por batida del cuadro completo (27 oct 2026):
 * - PROD = lo del reparto.
 * - DEC batida 1 = lo que Principal anotó sin decorar (se decora primero).
 * - DEC batida 2 = lo que se hornea (suma de PROD), si el producto lleva
 *   decoración.
 * Cualquier casilla cambiada a mano manda sobre lo automático; DEC 2 usa
 * el PROD ya ajustado. Solo salen los productos con algún número.
 */
export function batidasDelCuadro(params: {
  productos: readonly { id: number; lleva_decoracion: boolean }[];
  prodReparto: ReadonlyMap<number, readonly number[]>;
  sinDecorar: Readonly<Record<number, number>>;
  ajustes: readonly AjusteBatida[];
}): {
  dec: Map<number, number[]>;
  prod: Map<number, number[]>;
  ajustadas: Set<string>;
} {
  const ajuste = new Map(
    params.ajustes.map((a) => [claveBatida(a.producto_id, a.tipo, a.tanda), a.cantidad])
  );
  const conAjuste = (id: number, tipo: AjusteBatida["tipo"], base: readonly number[]) =>
    Array.from({ length: NUM_TANDAS }, (_, i) => ajuste.get(claveBatida(id, tipo, i + 1)) ?? base[i] ?? 0);
  const dec = new Map<number, number[]>();
  const prod = new Map<number, number[]>();
  for (const p of params.productos) {
    const prodFila = conAjuste(p.id, "produccion", params.prodReparto.get(p.id) ?? []);
    const hornear = prodFila.reduce((t, c) => t + c, 0);
    const decFila = conAjuste(p.id, "decoracion", [
      Math.max(params.sinDecorar[p.id] ?? 0, 0),
      p.lleva_decoracion ? hornear : 0,
    ]);
    if (prodFila.some((c) => c > 0)) prod.set(p.id, prodFila);
    if (decFila.some((c) => c > 0)) dec.set(p.id, decFila);
  }
  return { dec, prod, ajustadas: new Set(ajuste.keys()) };
}

/** Por producto y batida → filas tipo asignación (para `librasPorBatida`). */
export function comoAsignaciones(
  porProducto: ReadonlyMap<number, readonly number[]>,
  tipo: AjusteBatida["tipo"]
): AjusteBatida[] {
  return [...porProducto].flatMap(([producto_id, fila]) =>
    fila.map((cantidad, i) => ({ producto_id, tipo, tanda: i + 1, cantidad }))
  );
}

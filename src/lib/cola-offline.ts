/**
 * Cola de filas sin subir (modo sin internet, nov 2026).
 *
 * Cada fila del inventario se anota primero en la tablet (localStorage) y
 * se quita de ahí cuando Supabase confirma el guardado. Si se va la señal,
 * se recarga la página o se apaga la tablet, lo anotado sigue ahí y se
 * sube solo cuando vuelve el internet, aunque ya sea otro día.
 *
 * Una cola por usuaria: en una tablet compartida nadie sube filas ajenas.
 */

export type FilaPendiente = {
  fecha: string;
  sucursal_id: number;
  producto_id: number;
  saldo_inicial: number;
  ingreso: number;
  devolucion: number;
  pedido: number;
  cambio: number;
  decorado: number;
  sin_decorar: number;
  /** Nota de la tienda (devolución…); vacía = null. */
  nota?: string | null;
  /**
   * Inventario final contado al cerrar (solo tiendas); null = no se contó.
   * Sin la clave (Principal) no se toca lo que haya en la base.
   */
  saldo_final?: number | null;
  /** Del ingreso, lo que es de otros días: fecha → unidades; null = todo de hoy. */
  ingreso_anterior?: Record<string, number> | null;
  /** De qué día es lo devuelto y lo mandado a cambio (fecha → unidades). */
  devolucion_anterior?: Record<string, number> | null;
  cambio_anterior?: Record<string, number> | null;
  updated_at: string;
  updated_by: string;
};

/** Lo mínimo de `Storage` que se usa (para probar sin navegador). */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

const PREFIJO = "genies:cola-inventario:";

export const claveCola = (userId: string) => `${PREFIJO}${userId}`;

export const claveFila = (f: Pick<FilaPendiente, "fecha" | "sucursal_id" | "producto_id">) =>
  `${f.fecha}|${f.sucursal_id}|${f.producto_id}`;

/**
 * Ingreso de otros días sin vacíos ni ceros, con las fechas en orden;
 * null si no queda nada (para comparar y guardar siempre igual).
 */
export function normalizarAnterior(
  anterior: Record<string, unknown> | null | undefined
): Record<string, number> | null {
  const limpio = Object.entries(anterior ?? {})
    .map(([f, n]) => [f, typeof n === "number" ? n : parseInt(String(n), 10)] as const)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return limpio.length ? Object.fromEntries(limpio) : null;
}

/** Los números de la fila, para saber si lo confirmado es lo último anotado. */
export const firmaFila = (f: FilaPendiente) =>
  JSON.stringify([f.ingreso, f.devolucion, f.pedido, f.cambio, f.decorado, f.sin_decorar, (f.nota ?? "").trim(), f.saldo_final ?? null, normalizarAnterior(f.ingreso_anterior), normalizarAnterior(f.devolucion_anterior), normalizarAnterior(f.cambio_anterior)]);

function esFila(x: unknown): x is FilaPendiente {
  if (!x || typeof x !== "object") return false;
  const f = x as Record<string, unknown>;
  return (
    typeof f.fecha === "string" &&
    typeof f.updated_at === "string" &&
    typeof f.updated_by === "string" &&
    ["sucursal_id", "producto_id", "saldo_inicial", "ingreso", "devolucion", "pedido", "cambio", "decorado", "sin_decorar"].every(
      (k) => typeof f[k] === "number"
    )
  );
}

/** Lo que queda sin subir. Si el almacén falla o está dañado, cola vacía. */
export function leerCola(almacen: Almacen | null, userId: string): FilaPendiente[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(claveCola(userId));
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter(esFila) : [];
  } catch {
    return [];
  }
}

function escribir(almacen: Almacen, userId: string, cola: FilaPendiente[]): boolean {
  try {
    almacen.setItem(claveCola(userId), JSON.stringify(cola));
    return true;
  } catch {
    return false;
  }
}

/** Anota (o reemplaza) una fila. Devuelve false si la tablet no pudo guardarla. */
export function ponerEnCola(almacen: Almacen | null, userId: string, fila: FilaPendiente): boolean {
  if (!almacen) return false;
  const clave = claveFila(fila);
  const cola = leerCola(almacen, userId).filter((f) => claveFila(f) !== clave);
  cola.push(fila);
  return escribir(almacen, userId, cola);
}

/**
 * Quita una fila ya subida, solo si lo subido es lo último anotado: si la
 * encargada cambió el número mientras se subía, la fila sigue pendiente.
 */
export function quitarDeCola(almacen: Almacen | null, userId: string, subida: FilaPendiente): void {
  if (!almacen) return;
  const clave = claveFila(subida);
  const firma = firmaFila(subida);
  const cola = leerCola(almacen, userId);
  const restante = cola.filter((f) => claveFila(f) !== clave || firmaFila(f) !== firma);
  if (restante.length !== cola.length) escribir(almacen, userId, restante);
}

/** localStorage si se puede usar; null en el servidor o si está bloqueado. */
export function almacenDelNavegador(): Almacen | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

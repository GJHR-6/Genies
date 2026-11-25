/**
 * Orden único de productos en toda la app: el de las filas de la hoja
 * INVENTARIO DIARIO del Excel de la dueña, de arriba para abajo
 * (`productos.orden`). Los que todavía no tienen posición van al final,
 * por sección, nombre y tamaño.
 */
export type ProductoOrdenable = {
  orden?: number | null;
  categoria?: string | null;
  nombre: string;
  tamano?: string | null;
};

const SIN_ORDEN = Number.MAX_SAFE_INTEGER;

export function compararProductos(a: ProductoOrdenable, b: ProductoOrdenable): number {
  return (
    (a.orden ?? SIN_ORDEN) - (b.orden ?? SIN_ORDEN) ||
    (a.categoria ?? "").localeCompare(b.categoria ?? "", "es") ||
    a.nombre.localeCompare(b.nombre, "es") ||
    (a.tamano ?? "").localeCompare(b.tamano ?? "", "es")
  );
}

export function ordenarProductos<T extends ProductoOrdenable>(lista: readonly T[]): T[] {
  return [...lista].sort(compararProductos);
}

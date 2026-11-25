/**
 * Orden de las sucursales como en el Excel (INVENTARIO DIARIO, 4 nov 2026):
 * Principal, Cypress, Chalets, Century, Altara, Palenque. Una sucursal
 * nueva que no esté en la lista va al final, por id.
 */
const ORDEN_EXCEL = ["principal", "cypress", "chalets", "century", "altara", "palenque"];

const posicion = (nombre: string) => {
  const i = ORDEN_EXCEL.indexOf(nombre.trim().toLowerCase());
  return i === -1 ? ORDEN_EXCEL.length : i;
};

export function ordenarSucursales<T extends { id: number; nombre: string }>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => posicion(a.nombre) - posicion(b.nombre) || a.id - b.id);
}

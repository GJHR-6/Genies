import type { SugeridosDelDia } from "@/lib/sugeridos";

/**
 * Una fila de la hoja completa, igual que INVENTARIO DIARIO del Excel:
 *   PRODUCTO · DECO · SIN DECO · INV/TOTAL · (tienda · CM)… · SALDO
 *
 *  - DECO / SIN DECO: lo que Principal anotó hoy. Si el producto no se
 *    desglosa en decorado / sin decorar, su inventario va en DECO (como
 *    en el Excel).
 *  - INV/TOTAL = DECO + SIN DECO.
 *  - Por tienda: lo que se le manda (su sugerido) y CM (su cambio de hoy).
 *  - SALDO (de CM / Principal) = INV/TOTAL + Σ CM − Σ lo que se manda.
 *    Negativo = falta producto.
 */
export type FilaHojaCompleta = {
  deco: number | null;
  sinDeco: number | null;
  invTotal: number | null;
  tiendas: { sucursalId: number; mandar: number | null; cm: number | null }[];
  saldo: number;
};

export function filaHojaCompleta(
  dia: Pick<
    SugeridosDelDia,
    | "celdas"
    | "sinDecorar"
    | "decorado"
    | "cambios"
    | "saldoPrincipal"
    | "principalId"
  >,
  producto: { id: number; lleva_decoracion: boolean },
  tiendas: { id: number }[]
): FilaHojaCompleta {
  const sinDeco = producto.lleva_decoracion
    ? (dia.sinDecorar[producto.id] ?? null)
    : null;
  const deco = producto.lleva_decoracion
    ? (dia.decorado[producto.id] ?? null)
    : (dia.saldoPrincipal[producto.id] ?? null);
  const invTotal =
    deco === null && sinDeco === null ? null : (deco ?? 0) + (sinDeco ?? 0);

  let saldo = invTotal ?? 0;
  const porTienda = tiendas.map((t) => {
    const celda = dia.celdas[`${producto.id}-${t.id}`];
    const mandar = celda ? celda.sugerido : null;
    const cm = dia.cambios[`${producto.id}-${t.id}`] ?? null;
    saldo += (cm ?? 0) - (mandar ?? 0);
    return { sucursalId: t.id, mandar, cm };
  });

  return { deco, sinDeco, invTotal, tiendas: porTienda, saldo };
}

/** Secciones de masa que llevan fila de total al final (como en el Excel). */
export const SECCIONES_CON_TOTAL = ["VAINILLA", "CHOCOLATE", "MIXTO"];

/** Las porciones no entran en el total de la sección. */
export function cuentaEnTotalSeccion(producto: { nombre: string }): boolean {
  return !/^porci[oó]n/i.test(producto.nombre.trim());
}

/** Suma columna por columna varias filas de la hoja completa. */
export function sumarFilas(filas: FilaHojaCompleta[]): FilaHojaCompleta {
  const suma = (a: number | null, b: number | null) =>
    a === null && b === null ? null : (a ?? 0) + (b ?? 0);
  return filas.reduce<FilaHojaCompleta>(
    (total, f) => ({
      deco: suma(total.deco, f.deco),
      sinDeco: suma(total.sinDeco, f.sinDeco),
      invTotal: suma(total.invTotal, f.invTotal),
      tiendas: f.tiendas.map((t, i) => ({
        sucursalId: t.sucursalId,
        mandar: suma(total.tiendas[i]?.mandar ?? null, t.mandar),
        cm: suma(total.tiendas[i]?.cm ?? null, t.cm),
      })),
      saldo: total.saldo + f.saldo,
    }),
    { deco: null, sinDeco: null, invTotal: null, tiendas: [], saldo: 0 }
  );
}

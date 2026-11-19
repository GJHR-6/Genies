import type { SugeridosDelDia } from "@/lib/sugeridos";

/**
 * Una fila de la hoja completa, igual que INVENTARIO DIARIO del Excel:
 *   PRODUCTO · DECO · SIN DECO · INV/TOTAL · (tienda · CM)… · SALDO
 *
 *  - DECO / SIN DECO: lo que Principal anotó hoy. Si el producto no se
 *    desglosa en decorado / sin decorar, su inventario va en DECO (como
 *    en el Excel).
 *  - INV/TOTAL = DECO + SIN DECO.
 *  - Por tienda: lo que se manda = el PEDIDO que anotó la tienda (o el
 *    ajuste del admin), su sugerido de referencia y CM (su cambio de hoy).
 *    Sin pedido no se manda nada.
 *  - SALDO (de CM / Principal) = INV/TOTAL + Σ CM − Σ lo que se manda.
 *    Negativo = falta producto.
 */
export type FilaHojaCompleta = {
  deco: number | null;
  sinDeco: number | null;
  invTotal: number | null;
  tiendas: {
    sucursalId: number;
    mandar: number | null;
    cm: number | null;
    /** Sugerido de referencia; null = la tienda no lleva el producto. */
    sugerido: number | null;
    /** Lo cambió administración (no es el pedido de la tienda). */
    ajustado: boolean;
    /** Lo que no salió el día anterior y va incluido en `mandar`. */
    arrastre: number;
  }[];
  saldo: number;
};

export function filaHojaCompleta(
  dia: Pick<
    SugeridosDelDia,
    | "celdas"
    | "sinDecorar"
    | "decorado"
    | "cambios"
    | "pedidos"
    | "mandarOverride"
    | "saldoPrincipal"
    | "principalId"
  > &
    Partial<Pick<SugeridosDelDia, "arrastre">>,
  producto: { id: number; lleva_decoracion: boolean },
  tiendas: { id: number }[]
): FilaHojaCompleta {
  // Todos los productos pueden tener Deco / Sin deco anotados en Principal.
  // Si uno sin decoración no tiene nada anotado, su saldo va en DECO.
  const sinDeco = dia.sinDecorar[producto.id] ?? null;
  const deco =
    dia.decorado[producto.id] ??
    (producto.lleva_decoracion || sinDeco !== null
      ? null
      : (dia.saldoPrincipal[producto.id] ?? null));
  const invTotal =
    deco === null && sinDeco === null ? null : (deco ?? 0) + (sinDeco ?? 0);

  let saldo = invTotal ?? 0;
  const porTienda = tiendas.map((t) => {
    const clave = `${producto.id}-${t.id}`;
    const celda = dia.celdas[clave];
    const { mandar, ajustado, arrastre } = aMandar(dia, clave);
    const cm = dia.cambios[clave] ?? null;
    saldo += (cm ?? 0) - (mandar ?? 0);
    return { sucursalId: t.id, mandar, cm, sugerido: celda ? celda.sugerido : null, ajustado, arrastre };
  });

  return { deco, sinDeco, invTotal, tiendas: porTienda, saldo };
}

/**
 * Lo que se le manda a una tienda (clave `${productoId}-${sucursalId}`): el
 * ajuste del admin si hay; si no, el pedido de la tienda más lo que no salió
 * el día anterior; sin nada de eso, nada.
 */
export function aMandar(
  dia: Pick<SugeridosDelDia, "pedidos" | "mandarOverride"> & Partial<Pick<SugeridosDelDia, "arrastre">>,
  clave: string
): { mandar: number | null; ajustado: boolean; arrastre: number } {
  // Lo que no salió el día anterior se suma solo (19 nov). El ajuste del
  // admin es el total final: ya lo incluye.
  const arrastre = dia.arrastre?.[clave] ?? 0;
  const ajuste = dia.mandarOverride[clave];
  if (ajuste !== undefined) return { mandar: ajuste, ajustado: true, arrastre: 0 };
  const pedido = dia.pedidos[clave] ?? null;
  return {
    mandar: pedido === null && arrastre === 0 ? null : (pedido ?? 0) + arrastre,
    ajustado: false,
    arrastre,
  };
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
        sugerido: suma(total.tiendas[i]?.sugerido ?? null, t.sugerido),
        ajustado: false,
        arrastre: (total.tiendas[i]?.arrastre ?? 0) + t.arrastre,
      })),
      saldo: total.saldo + f.saldo,
    }),
    { deco: null, sinDeco: null, invTotal: null, tiendas: [], saldo: 0 }
  );
}

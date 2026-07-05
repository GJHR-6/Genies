import type { Enums } from "@/lib/types";

export type EstadoDia = Enums<"estado_dia">;

export type SucursalBase = { id: number; nombre: string };

export type FilaMovimientoDia = {
  sucursal_id: number;
  producto_id: number;
  updated_at: string;
};

export type FilaCierreDia = {
  sucursal_id: number;
  estado: EstadoDia;
};

export type ResumenSucursal = {
  id: number;
  nombre: string;
  estado: EstadoDia;
  capturados: number;
  ultimoRegistro: string | null;
};

/** Estado del día por sucursal a partir de movimientos y cierres de la fecha. */
export function resumirDia(
  sucursales: SucursalBase[],
  movimientos: FilaMovimientoDia[],
  cierres: FilaCierreDia[]
): ResumenSucursal[] {
  const porSucursal = new Map<
    number,
    { productos: Set<number>; ultimo: string | null }
  >();
  for (const m of movimientos) {
    let agregado = porSucursal.get(m.sucursal_id);
    if (!agregado) {
      agregado = { productos: new Set(), ultimo: null };
      porSucursal.set(m.sucursal_id, agregado);
    }
    agregado.productos.add(m.producto_id);
    if (!agregado.ultimo || m.updated_at > agregado.ultimo) {
      agregado.ultimo = m.updated_at;
    }
  }
  const cierrePorSucursal = new Map(cierres.map((c) => [c.sucursal_id, c.estado]));

  return sucursales.map((s) => {
    const agregado = porSucursal.get(s.id);
    const cierre = cierrePorSucursal.get(s.id);
    const estado: EstadoDia =
      cierre === "cerrado"
        ? "cerrado"
        : agregado
          ? "en_captura"
          : "sin_iniciar";
    return {
      id: s.id,
      nombre: s.nombre,
      estado,
      capturados: agregado?.productos.size ?? 0,
      ultimoRegistro: agregado?.ultimo ?? null,
    };
  });
}

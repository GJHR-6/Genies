import {
  SUCURSAL_PRUEBA,
  admin,
  borrarEstado,
  guardarEstado,
  hoy,
  idSucursalPrueba,
  limpiarCatalogos,
} from "./datos";

/**
 * Guardas antes de tocar producción. Si hay datos reales de hoy en la
 * sucursal de prueba o ya existe un reparto de hoy, NO se corre nada.
 */
export default async function globalSetup() {
  borrarEstado();
  if (process.env.E2E_PERMITIR_PRODUCCION !== "1") {
    throw new Error(
      "Los tests E2E escriben en la base de producción. Para correrlos usá `npm run e2e` (define E2E_PERMITIR_PRODUCCION=1) y leé e2e/README.md."
    );
  }

  const sb = admin();
  const fecha = hoy();
  const sucursal = await idSucursalPrueba();

  // Restos de catálogo de una corrida que se cortó (nombres E2E): seguro borrarlos.
  // El inventario y el reparto NO se tocan aquí: primero se revisan las guardas.
  await limpiarCatalogos();

  const [movs, cierre, plan, asignaciones] = await Promise.all([
    sb
      .from("movimientos_diarios")
      .select("id", { count: "exact", head: true })
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursal),
    sb.from("cierres_dia").select("estado").eq("fecha", fecha).eq("sucursal_id", sucursal),
    sb.from("planes_dia").select("estado").eq("fecha", fecha),
    sb.from("asignaciones").select("id", { count: "exact", head: true }).eq("fecha", fecha),
  ]);
  if ((movs.count ?? 0) > 0 || (cierre.data ?? []).length > 0) {
    throw new Error(
      `${SUCURSAL_PRUEBA} ya tiene inventario de hoy: no se corren los tests. Si son restos de una corrida E2E cortada, corré \`npm run e2e:limpiar\`.`
    );
  }

  // Producto fijo para el test de objetivos: el primero activo con objetivo
  // en la sucursal de prueba. Se guardan sus objetivos para restaurarlos.
  const { data: reglas } = await sb
    .from("reglas_sugerido")
    .select("producto_id, sucursal_id, dia_semana, objetivo, productos!inner(activo)")
    .eq("sucursal_id", sucursal)
    .eq("productos.activo", true)
    .order("producto_id")
    .limit(50);
  const productoReglas = reglas?.[0]?.producto_id ?? null;

  guardarEstado({
    fecha,
    repartoLibre: (plan.data ?? []).length === 0 && (asignaciones.count ?? 0) === 0,
    productoReglas,
    reglas: (reglas ?? [])
      .filter((r) => r.producto_id === productoReglas)
      .map(({ producto_id, sucursal_id, dia_semana, objetivo }) => ({
        producto_id,
        sucursal_id,
        dia_semana,
        objetivo,
      })),
  });
}

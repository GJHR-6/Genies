/**
 * Datos de DEMOSTRACIÓN: inventario de la última semana y de hoy.
 *
 *   - 6 días de producción antes de hoy (sin domingo): las 6 tiendas
 *     anotaron y cerraron → Historial y Rotación tienen datos.
 *   - Hoy: 5 tiendas terminaron y la última (Palenque) sigue contando, para
 *     cerrarle el día en vivo. 2 sugeridos cambiados a mano en Principal.
 *   - Sin reparto de hoy: se hace en vivo durante la demo.
 *
 * ⚠️ BORRA y reescribe inventario y cierres de TODAS las sucursales en ese
 * rango de fechas. Solo para antes del piloto. Se limpia con
 * supabase/mantenimiento/limpiar-datos-demo.sql (agregar el rango).
 *
 * Uso: DEMO_PERMITIR=1 npx tsx --env-file=.env.local scripts/datos-demo.ts
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types";
import { cargarReglas, diaSemana } from "../src/lib/sugeridos";
import { diaAnterior, hoyTegucigalpa } from "../src/lib/fechas";

if (process.env.DEMO_PERMITIR !== "1") {
  console.error("Este script reescribe datos. Definí DEMO_PERMITIR=1 para correrlo.");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !llave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const sb = createClient<Database>(url, llave, { auth: { persistSession: false } });

const DIAS_ANTES = 6;
const TIENDA_EN_CURSO = "Palenque";

// Aleatorio con semilla: mismos datos en cada corrida.
let semilla = 20261016;
function azar() {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
}
const entre = (min: number, max: number) => Math.floor(min + azar() * (max - min + 1));

type Fila = Database["public"]["Tables"]["movimientos_diarios"]["Insert"];

async function main() {
  const hoy = hoyTegucigalpa();
  if (diaSemana(hoy) === 0) {
    console.error("Hoy es domingo: no hay producción para demostrar.");
    process.exit(1);
  }

  // Días de producción: los 6 anteriores (sin domingo) + hoy.
  const fechas: string[] = [hoy];
  let f = hoy;
  while (fechas.length < DIAS_ANTES + 1) {
    f = diaAnterior(f);
    if (diaSemana(f) !== 0) fechas.unshift(f);
  }
  const desde = fechas[0];

  const [productosRes, sucursalesRes, reglas, adminRes] = await Promise.all([
    sb.from("productos").select("id, lleva_decoracion").eq("activo", true),
    sb.from("sucursales").select("id, nombre, es_principal").eq("activa", true).order("id"),
    cargarReglas(sb),
    sb.from("perfiles").select("user_id").eq("rol", "admin").limit(1).single(),
  ]);
  const productos = productosRes.data ?? [];
  const sucursales = sucursalesRes.data ?? [];
  const decoracion = new Set(productos.filter((p) => p.lleva_decoracion).map((p) => p.id));
  const activos = new Set(productos.map((p) => p.id));
  const adminId = adminRes.data?.user_id ?? null;

  /** Objetivo del día: la regla del día de semana manda sobre la general. */
  function objetivo(productoId: number, sucursalId: number, fecha: string): number | null {
    const dow = diaSemana(fecha);
    let general: number | null = null;
    for (const r of reglas) {
      if (r.producto_id !== productoId || r.sucursal_id !== sucursalId) continue;
      if (r.dia_semana === dow) return r.objetivo;
      if (r.dia_semana === null) general = r.objetivo;
    }
    return general;
  }

  const conRegla = new Map<number, number[]>();
  for (const r of reglas) {
    if (!activos.has(r.producto_id)) continue;
    const lista = conRegla.get(r.sucursal_id) ?? [];
    if (!lista.includes(r.producto_id)) lista.push(r.producto_id);
    conRegla.set(r.sucursal_id, lista);
  }

  console.log(`Rango: ${desde} → ${hoy} (${fechas.length} días de producción)`);
  const borrar = await Promise.all([
    sb.from("movimientos_diarios").delete({ count: "exact" }).gte("fecha", desde).lte("fecha", hoy),
    sb.from("cierres_dia").delete({ count: "exact" }).gte("fecha", desde).lte("fecha", hoy),
    sb.from("asignaciones").delete({ count: "exact" }).eq("fecha", hoy),
    sb.from("planes_dia").delete({ count: "exact" }).eq("fecha", hoy),
  ]);
  for (const r of borrar) if (r.error) throw new Error(r.error.message);
  console.log(
    `Borrado previo: ${borrar[0].count} movimientos, ${borrar[1].count} cierres, ${borrar[2].count} asignaciones de hoy`
  );

  const filas: Fila[] = [];
  const cierres: Database["public"]["Tables"]["cierres_dia"]["Insert"][] = [];
  const saldo = new Map<string, number>(); // `${suc}-${prod}` → saldo al cierre
  // ~12 % de producto×tienda se vende lento y no se repone mientras haya
  // existencias: así Rotación muestra unidades de 2 y 3+ días.
  const lentos = new Set<string>();
  for (const s of sucursales)
    for (const productoId of conRegla.get(s.id) ?? [])
      if (azar() < 0.12) lentos.add(`${s.id}-${productoId}`);

  for (const fecha of fechas) {
    const esHoy = fecha === hoy;
    for (const s of sucursales) {
      const enCurso = esHoy && s.nombre === TIENDA_EN_CURSO;
      const lista = conRegla.get(s.id) ?? [];
      lista.forEach((productoId, i) => {
        // La tienda que sigue contando lleva ~60 % de la lista.
        if (enCurso && i > lista.length * 0.6) return;
        const obj = objetivo(productoId, s.id, fecha);
        if (obj === null) return;
        const clave = `${s.id}-${productoId}`;
        const lento = lentos.has(clave);
        const saldoInicial =
          saldo.get(clave) ?? (lento ? Math.max(obj, 2) : entre(0, Math.ceil(obj / 3)));
        const ingreso =
          lento && saldoInicial >= Math.ceil(obj / 2)
            ? 0
            : Math.max(obj - saldoInicial + entre(-1, 1), 0);
        const disponible = saldoInicial + ingreso;
        const devolucion = !lento && azar() < 0.1 ? Math.min(entre(1, 2), disponible) : 0;
        const vendeFraccion = lento ? 0.1 + azar() * 0.15 : 0.5 + azar() * 0.4;
        const queda = Math.max(
          Math.round((disponible - devolucion) * (1 - vendeFraccion)),
          0
        );
        const decorado =
          s.es_principal && decoracion.has(productoId) ? Math.round(ingreso * 0.6) : 0;
        filas.push({
          fecha,
          sucursal_id: s.id,
          producto_id: productoId,
          saldo_inicial: saldoInicial,
          ingreso,
          devolucion,
          pedido: azar() < 0.08 ? entre(1, 3) : 0,
          saldo_final: queda,
          decorado,
          sin_decorar: s.es_principal && decoracion.has(productoId) ? ingreso - decorado : 0,
          updated_at: `${fecha}T${String(entre(13, 16)).padStart(2, "0")}:${String(entre(0, 59)).padStart(2, "0")}:00Z`,
        });
        saldo.set(clave, queda);
      });
      cierres.push({
        fecha,
        sucursal_id: s.id,
        estado: enCurso ? "en_captura" : "cerrado",
        cerrado_at: enCurso ? null : `${fecha}T17:${String(entre(0, 59)).padStart(2, "0")}:00Z`,
        cerrado_by: enCurso ? null : adminId,
      });
    }
  }

  // Dos sugeridos cambiados a mano hoy en Principal (p. ej. un pedido grande).
  const principal = sucursales.find((s) => s.es_principal);
  const dePrincipalHoy = filas.filter((x) => x.fecha === hoy && x.sucursal_id === principal?.id);
  for (const x of dePrincipalHoy.slice(0, 2)) {
    const obj = objetivo(x.producto_id, x.sucursal_id, hoy) ?? 0;
    x.sugerido_override = Math.max(obj - (x.saldo_final ?? 0), 0) + 10;
  }

  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await sb.from("movimientos_diarios").insert(filas.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  const { error } = await sb.from("cierres_dia").insert(cierres);
  if (error) throw new Error(error.message);

  const deHoy = filas.filter((x) => x.fecha === hoy).length;
  console.log(
    `Listo: ${filas.length} filas de inventario (${deHoy} de hoy), ${cierres.length} cierres. ${TIENDA_EN_CURSO} sigue contando hoy.`
  );
  console.log(`Para borrarlos: rango ${desde} a ${hoy} en limpiar-datos-demo.sql`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

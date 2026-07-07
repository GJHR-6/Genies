/**
 * M6 — Verificación de integración contra Supabase (RLS y flujo completo).
 *
 * Cubre los criterios del PRD:
 *   #1/#5  captura por fila (upsert + edición) y persistencia
 *   #2     aislamiento entre sucursales (RLS de lectura y escritura)
 *   además: vendido calculado, cierre/reapertura y override de sugeridos.
 *
 * ⚠️ Escribe y luego deja en cero la fila de HOY del primer producto del
 * catálogo para la sucursal del usuario tienda. No usar durante el piloto
 * en la sucursal piloto.
 *
 * Uso:  node --env-file=.env.local --experimental-strip-types scripts/verificar-flujo.ts
 *   o:  npx tsx scripts/verificar-flujo.ts   (con las env ya exportadas)
 *
 * Credenciales por env (con defaults de los usuarios de prueba):
 *   PRUEBA_TIENDA_EMAIL / PRUEBA_TIENDA_PASSWORD
 *   PRUEBA_ADMIN_EMAIL  / PRUEBA_ADMIN_PASSWORD
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const LLAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_SUPABASE || !LLAVE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const TIENDA_EMAIL = process.env.PRUEBA_TIENDA_EMAIL ?? "cypress@genies.test";
const TIENDA_PASSWORD = process.env.PRUEBA_TIENDA_PASSWORD ?? "PruebaM3-2026";
const ADMIN_EMAIL = process.env.PRUEBA_ADMIN_EMAIL ?? "admin@genies.test";
const ADMIN_PASSWORD = process.env.PRUEBA_ADMIN_PASSWORD ?? "AdminGenies-2026";

const hoy = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Tegucigalpa",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

let fallas = 0;
function reportar(ok: boolean, paso: string, detalle = ""): void {
  if (ok) {
    console.log(`✓ ${paso}`);
  } else {
    fallas += 1;
    console.error(`✗ ${paso}${detalle ? `: ${detalle}` : ""}`);
  }
}

async function main(): Promise<void> {
  const tienda = createClient<Database>(URL_SUPABASE!, LLAVE!);
  const admin = createClient<Database>(URL_SUPABASE!, LLAVE!);

  // --- Login -----------------------------------------------------------------
  const sesionTienda = await tienda.auth.signInWithPassword({
    email: TIENDA_EMAIL,
    password: TIENDA_PASSWORD,
  });
  reportar(!sesionTienda.error, `login tienda (${TIENDA_EMAIL})`, sesionTienda.error?.message);
  const sesionAdmin = await admin.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  reportar(!sesionAdmin.error, `login admin (${ADMIN_EMAIL})`, sesionAdmin.error?.message);
  if (fallas > 0) process.exit(1);
  const tiendaUserId = sesionTienda.data.user!.id;

  const { data: perfil } = await tienda
    .from("perfiles")
    .select("sucursal_id")
    .eq("user_id", tiendaUserId)
    .single();
  const sucursalId = perfil?.sucursal_id;
  reportar(typeof sucursalId === "number", "perfil de tienda con sucursal");
  if (typeof sucursalId !== "number") process.exit(1);

  // --- Catálogo --------------------------------------------------------------
  const { data: productos } = await tienda
    .from("productos")
    .select("id")
    .eq("activo", true)
    .order("id")
    .limit(1);
  const productoId = productos?.[0]?.id;
  reportar(typeof productoId === "number", "catálogo visible para la tienda");
  if (typeof productoId !== "number") process.exit(1);

  // --- Captura: upsert, edición y vendido calculado ---------------------------
  const base = {
    fecha: hoy,
    sucursal_id: sucursalId,
    producto_id: productoId,
    saldo_inicial: 0,
    ingreso: 8,
    devolucion: 1,
    pedido: 3,
    decorado: 0,
    sin_decorar: 0,
    saldo_final: 3,
    updated_by: tiendaUserId,
  };
  const upsert1 = await tienda
    .from("movimientos_diarios")
    .upsert(base, { onConflict: "fecha,sucursal_id,producto_id" });
  reportar(!upsert1.error, "captura: upsert de fila", upsert1.error?.message);

  const upsert2 = await tienda
    .from("movimientos_diarios")
    .upsert({ ...base, ingreso: 9 }, { onConflict: "fecha,sucursal_id,producto_id" });
  reportar(!upsert2.error, "captura: edición de fila", upsert2.error?.message);

  const { data: fila } = await tienda
    .from("v_movimientos")
    .select("ingreso, vendido")
    .eq("fecha", hoy)
    .eq("sucursal_id", sucursalId)
    .eq("producto_id", productoId)
    .single();
  reportar(fila?.ingreso === 9, "captura: edición persistida", `ingreso=${fila?.ingreso}`);
  // vendido = saldo_inicial + ingreso − devolución − saldo_final = 0 + 9 − 1 − 3
  reportar(fila?.vendido === 5, "vendido calculado (0+9−1−3=5)", `vendido=${fila?.vendido}`);

  // --- RLS: aislamiento entre sucursales --------------------------------------
  const otraSucursal = sucursalId === 1 ? 2 : 1;
  const escrituraAjena = await tienda
    .from("movimientos_diarios")
    .upsert(
      { ...base, sucursal_id: otraSucursal },
      { onConflict: "fecha,sucursal_id,producto_id" }
    );
  reportar(
    escrituraAjena.error !== null,
    "RLS: escritura en sucursal ajena bloqueada"
  );
  const lecturaAjena = await tienda
    .from("movimientos_diarios")
    .select("id")
    .eq("sucursal_id", otraSucursal);
  reportar(
    (lecturaAjena.data ?? []).length === 0,
    "RLS: lectura de sucursal ajena vacía"
  );

  // --- Cierre del día por la tienda -------------------------------------------
  const cierre = await tienda.from("cierres_dia").upsert(
    {
      fecha: hoy,
      sucursal_id: sucursalId,
      estado: "cerrado",
      cerrado_at: new Date().toISOString(),
      cerrado_by: tiendaUserId,
    },
    { onConflict: "fecha,sucursal_id" }
  );
  reportar(!cierre.error, "cierre del día por la tienda", cierre.error?.message);

  // --- Admin: visibilidad total, override y reapertura -------------------------
  const { data: vistoAdmin } = await admin
    .from("movimientos_diarios")
    .select("ingreso")
    .eq("fecha", hoy)
    .eq("sucursal_id", sucursalId)
    .eq("producto_id", productoId)
    .single();
  reportar(vistoAdmin?.ingreso === 9, "admin ve la captura de la tienda");

  const override = await admin
    .from("movimientos_diarios")
    .update({ sugerido_override: 12 })
    .eq("fecha", hoy)
    .eq("sucursal_id", sucursalId)
    .eq("producto_id", productoId)
    .select("id");
  reportar(
    !override.error && (override.data ?? []).length === 1,
    "admin aplica override de sugerido",
    override.error?.message
  );

  const { data: sugerido } = await admin
    .from("v_sugeridos")
    .select("sugerido, es_override")
    .eq("fecha", hoy)
    .eq("sucursal_id", sucursalId)
    .eq("producto_id", productoId)
    .maybeSingle();
  reportar(
    sugerido?.sugerido === 12 && sugerido.es_override === true,
    "v_sugeridos refleja el override",
    JSON.stringify(sugerido)
  );

  const reapertura = await admin.from("cierres_dia").upsert(
    {
      fecha: hoy,
      sucursal_id: sucursalId,
      estado: "en_captura",
      cerrado_at: null,
      cerrado_by: null,
    },
    { onConflict: "fecha,sucursal_id" }
  );
  reportar(!reapertura.error, "admin reabre el día", reapertura.error?.message);

  // --- Limpieza (RLS no permite delete de movimientos: se deja la fila en 0) ---
  const limpiezaFila = await admin
    .from("movimientos_diarios")
    .update({
      saldo_inicial: 0,
      ingreso: 0,
      devolucion: 0,
      pedido: 0,
      decorado: 0,
      sin_decorar: 0,
      saldo_final: null,
      sugerido_override: null,
    })
    .eq("fecha", hoy)
    .eq("sucursal_id", sucursalId)
    .eq("producto_id", productoId);
  const limpiezaCierre = await admin
    .from("cierres_dia")
    .delete()
    .eq("fecha", hoy)
    .eq("sucursal_id", sucursalId);
  reportar(
    !limpiezaFila.error && !limpiezaCierre.error,
    "limpieza de datos de prueba",
    limpiezaFila.error?.message ?? limpiezaCierre.error?.message
  );

  console.log(fallas === 0 ? "\nTodo OK" : `\n${fallas} verificación(es) fallaron`);
  process.exit(fallas === 0 ? 0 : 1);
}

void main();

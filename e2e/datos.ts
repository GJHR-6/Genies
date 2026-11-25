import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types";

/**
 * Apoyo de los tests E2E: usuarios de prueba, fecha del negocio y un
 * cliente con la service key SOLO para preparar y limpiar datos (nunca
 * para lo que se está probando, que va siempre por la interfaz).
 */

export const USUARIOS = {
  admin: {
    email: process.env.PRUEBA_ADMIN_EMAIL ?? "admin@genies.test",
    password: process.env.PRUEBA_ADMIN_PASSWORD ?? "AdminGenies-2026",
  },
  tienda: {
    email: process.env.PRUEBA_TIENDA_EMAIL ?? "cypress@genies.test",
    password: process.env.PRUEBA_TIENDA_PASSWORD ?? "PruebaM3-2026",
  },
  principal: {
    email: process.env.PRUEBA_PRINCIPAL_EMAIL ?? "principal@genies.test",
    password: process.env.PRUEBA_PRINCIPAL_PASSWORD ?? "Genies-Principal-2026",
  },
} as const;
export type Rol = keyof typeof USUARIOS;

/** Sucursal donde los tests escriben inventario. */
export const SUCURSAL_PRUEBA = process.env.E2E_SUCURSAL ?? "Cypress";
/** Todo lo que los tests crean en catálogos empieza así (y se borra al final). */
export const PREFIJO = "E2E ";
export const CORREO_PRUEBA = /^e2e-.*@genies\.test$/;

export const sesion = (rol: Rol) => path.join(__dirname, ".auth", `${rol}.json`);

const ARCHIVO_ESTADO = path.join(__dirname, ".estado", "inicio.json");

export function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function esDomingo(): boolean {
  return new Date(`${hoy()}T12:00:00Z`).getUTCDay() === 0;
}

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local (la service key se usa solo para preparar y limpiar datos de prueba)."
    );
  }
  return createClient<Database>(url, llave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function idSucursalPrueba(): Promise<number> {
  const { data, error } = await admin()
    .from("sucursales")
    .select("id")
    .eq("nombre", SUCURSAL_PRUEBA)
    .single();
  if (error || !data) throw new Error(`No existe la sucursal ${SUCURSAL_PRUEBA}`);
  return data.id;
}

/** Lo que había al empezar: decide qué puede borrar la limpieza. */
export type EstadoInicial = {
  fecha: string;
  /** Si al empezar NO había reparto de hoy, la limpieza puede borrarlo. */
  repartoLibre: boolean;
  /** Objetivos originales del producto que usa el test de objetivos. */
  reglas: {
    producto_id: number;
    sucursal_id: number;
    dia_semana: number | null;
    objetivo: number;
  }[];
  productoReglas: number | null;
};

export function guardarEstado(estado: EstadoInicial) {
  mkdirSync(path.dirname(ARCHIVO_ESTADO), { recursive: true });
  writeFileSync(ARCHIVO_ESTADO, JSON.stringify(estado, null, 2));
}

/** Sin este archivo la limpieza final no toca el día (las guardas no pasaron). */
export function borrarEstado() {
  rmSync(ARCHIVO_ESTADO, { force: true });
}

export function leerEstado(): EstadoInicial | null {
  if (!existsSync(ARCHIVO_ESTADO)) return null;
  return JSON.parse(readFileSync(ARCHIVO_ESTADO, "utf8")) as EstadoInicial;
}

/** Deja el día de la sucursal de prueba sin inventario ni cierre. */
export async function vaciarDiaPrueba() {
  const sb = admin();
  const sucursal = await idSucursalPrueba();
  const fecha = hoy();
  await sb.from("movimientos_diarios").delete().eq("fecha", fecha).eq("sucursal_id", sucursal);
  await sb.from("cierres_dia").delete().eq("fecha", fecha).eq("sucursal_id", sucursal);
}

/** Borra el reparto de hoy, pero solo si el test lo creó (no había al empezar). */
export async function vaciarRepartoDeHoy() {
  const estado = leerEstado();
  if (!estado?.repartoLibre || estado.fecha !== hoy()) {
    throw new Error("Al empezar ya había un reparto de hoy: no se toca.");
  }
  const sb = admin();
  await sb.from("asignaciones").delete().eq("fecha", estado.fecha);
  await sb.from("planes_dia").delete().eq("fecha", estado.fecha);
}

/**
 * Limpieza final: borra todo lo que crean los tests y restaura lo que
 * cambian. Es idempotente; también se puede correr sola (npm run e2e:limpiar).
 */
export async function limpiar(): Promise<string[]> {
  const hecho: string[] = [];
  const estado = leerEstado();

  await vaciarDiaPrueba();
  hecho.push(`inventario y cierre de hoy de ${SUCURSAL_PRUEBA}`);

  if (estado?.repartoLibre && estado.fecha === hoy()) {
    await vaciarRepartoDeHoy();
    hecho.push("reparto de hoy (lo creó el test)");
  }

  if (estado?.productoReglas) {
    const sb = admin();
    const sucursal = await idSucursalPrueba();
    await sb
      .from("reglas_sugerido")
      .delete()
      .eq("producto_id", estado.productoReglas)
      .eq("sucursal_id", sucursal);
    const originales = estado.reglas.filter((r) => r.sucursal_id === sucursal);
    if (originales.length > 0) await sb.from("reglas_sugerido").insert(originales);
    hecho.push(`objetivos originales del producto ${estado.productoReglas} en ${SUCURSAL_PRUEBA}`);
  }

  hecho.push(...(await limpiarCatalogos()));
  return hecho;
}

/** Borra lo creado en catálogos y cuentas (nombres con prefijo E2E). Seguro siempre. */
export async function limpiarCatalogos(): Promise<string[]> {
  const sb = admin();
  const hecho: string[] = [];
  const { data: productos } = await sb
    .from("productos")
    .select("id")
    .like("nombre", `${PREFIJO}%`);
  const ids = (productos ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await sb.from("reglas_sugerido").delete().in("producto_id", ids);
    await sb.from("productos").delete().in("id", ids);
    hecho.push(`${ids.length} producto(s) de prueba`);
  }

  const { data: deptos } = await sb
    .from("departamentos")
    .select("id")
    .like("nombre", `${PREFIJO}%`);
  if ((deptos ?? []).length > 0) {
    await sb
      .from("departamentos")
      .delete()
      .in("id", deptos!.map((d) => d.id));
    hecho.push(`${deptos!.length} departamento(s) de prueba`);
  }

  const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of lista?.users ?? []) {
    if (u.email && CORREO_PRUEBA.test(u.email)) {
      await sb.auth.admin.deleteUser(u.id);
      hecho.push(`usuario ${u.email}`);
    }
  }

  return hecho;
}

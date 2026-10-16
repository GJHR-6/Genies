"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { hoyTegucigalpa } from "@/lib/fechas";
import { cargarSugeridosDelDia } from "@/lib/sugeridos";
import { generarReparto } from "@/lib/reparto";
import { COLUMNAS_PASTELERA, aPastelera } from "@/lib/asignaciones";
import { colorDelDia } from "@/lib/color-dia";

export type ResultadoAccion =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string };

async function exigirAdmin(): Promise<ResultadoAccion | null> {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "admin") {
    return { ok: false, mensaje: "Solo administración puede hacer esto." };
  }
  return null;
}

/**
 * Genera el reparto de hoy desde los sugeridos (mismo total que el
 * cuadro) y los porcentajes fijos de cada pastelera. Reemplaza el reparto
 * anterior y lo deja en borrador.
 */
export async function generarRepartoDelDia(): Promise<ResultadoAccion> {
  const sinPermiso = await exigirAdmin();
  if (sinPermiso) return sinPermiso;

  const fecha = hoyTegucigalpa();
  if (!colorDelDia(fecha)) {
    return { ok: false, mensaje: "Hoy es domingo: no hay producción." };
  }

  const supabase = await createClient();
  try {
    const [dia, pastelerasRes, areasRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      supabase.from("pasteleras").select(COLUMNAS_PASTELERA),
      supabase.from("areas_produccion").select("id, es_decoracion, activa"),
    ]);
    if (pastelerasRes.error) throw new Error(pastelerasRes.error.message);
    if (areasRes.error) throw new Error(areasRes.error.message);

    // Total por producto = suma de sugeridos de todas las sucursales.
    const totales = new Map<number, number>();
    for (const p of dia.productos) {
      let total = 0;
      for (const s of dia.sucursales) {
        total += dia.celdas[`${p.id}-${s.id}`]?.sugerido ?? 0;
      }
      if (total > 0) totales.set(p.id, total);
    }

    const areaDecoracion =
      (areasRes.data ?? []).find((a) => a.es_decoracion && a.activa) ?? null;

    const filas = generarReparto({
      fecha,
      productos: dia.productos,
      totales,
      pasteleras: (pastelerasRes.data ?? []).map(aPastelera),
      areaDecoracionId: areaDecoracion?.id ?? null,
    });

    const { data, error } = await supabase.rpc("reemplazar_asignaciones", {
      p_fecha: fecha,
      p_filas: filas,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/asignar");
    return {
      ok: true,
      mensaje: `Listo: se repartieron ${data ?? filas.length} trabajos. Revisalo y tocá «Enviar a cocina».`,
    };
  } catch {
    return {
      ok: false,
      mensaje: "No se pudo hacer el reparto. Revisá que haya internet e intentá de nuevo.",
    };
  }
}

/** Publica el reparto de hoy a la tablet de cocina, o lo regresa a borrador. */
export async function cambiarEstadoReparto(
  publicar: boolean
): Promise<ResultadoAccion> {
  const sinPermiso = await exigirAdmin();
  if (sinPermiso) return sinPermiso;

  const fecha = hoyTegucigalpa();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("planes_dia")
    .update({
      estado: publicar ? "publicado" : "borrador",
      publicado_at: publicar ? new Date().toISOString() : null,
      updated_by: user?.id ?? null,
    })
    .eq("fecha", fecha)
    .select("fecha");

  if (error)
    return { ok: false, mensaje: "No se pudo guardar. Revisá que haya internet e intentá de nuevo." };
  if ((data ?? []).length === 0) {
    return { ok: false, mensaje: "Primero tocá «Hacer el reparto»." };
  }

  revalidatePath("/asignar");
  revalidatePath("/cocina");
  return {
    ok: true,
    mensaje: publicar
      ? "Enviado: las pasteleras ya lo ven en la tablet de cocina."
      : "Listo: la tablet de cocina dejó de mostrar el reparto.",
  };
}

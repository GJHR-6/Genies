import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_PASTELERA, aPastelera } from "@/lib/asignaciones";
import { EncabezadoCatalogo } from "../catalogos/_componentes/encabezado";
import { PastelerasCliente } from "./pasteleras-cliente";

export const dynamic = "force-dynamic";

export default async function PastelerasPage() {
  const supabase = await createClient();
  const [areasRes, pastelerasRes] = await Promise.all([
    supabase
      .from("areas_produccion")
      .select("id, nombre, orden, es_decoracion, activa, trabajo_en_equipo")
      .order("orden"),
    supabase.from("pasteleras").select(COLUMNAS_PASTELERA).order("orden").order("id"),
  ]);

  if (areasRes.error || pastelerasRes.error) {
    return (
      <section className="space-y-2">
        <EncabezadoCatalogo actual="pasteleras" />
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página.
        </p>
      </section>
    );
  }

  return (
    <PastelerasCliente
      areas={areasRes.data ?? []}
      pastelerasIniciales={(pastelerasRes.data ?? []).map(aPastelera)}
    />
  );
}

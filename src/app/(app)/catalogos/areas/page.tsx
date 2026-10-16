import { createClient } from "@/lib/supabase/server";
import { AreasCliente } from "./areas-cliente";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const supabase = await createClient();

  const [areas, productos] = await Promise.all([
    supabase
      .from("areas_produccion")
      .select(
        "id, nombre, encargadas, orden, activa, es_decoracion, pasteleras(nombre, activa, orden)"
      )
      .order("orden"),
    supabase
      .from("productos")
      .select("id, nombre, tamano, area_id")
      .eq("activo", true)
      .order("orden_area")
      .order("nombre"),
  ]);

  return (
    <section className="flex flex-col gap-5 py-2">
      <AreasCliente areas={areas.data ?? []} productos={productos.data ?? []} />
    </section>
  );
}

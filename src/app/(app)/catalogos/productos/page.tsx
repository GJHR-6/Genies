import { createClient } from "@/lib/supabase/server";
import { ProductosCliente } from "./productos-cliente";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const supabase = await createClient();

  const [productos, departamentos, areas] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, nombre, tamano, categoria, departamento_id, area_id, orden_area, orden, temporada, lleva_decoracion, activo"
      )
      .order("orden", { nullsFirst: false })
      .order("categoria")
      .order("nombre")
      .order("tamano"),
    supabase.from("departamentos").select("id, nombre, activo").order("nombre"),
    supabase
      .from("areas_produccion")
      .select("id, nombre, activa")
      .eq("es_decoracion", false)
      .order("orden"),
  ]);

  return (
    <section className="flex flex-col gap-5 py-2">
      <ProductosCliente
        productos={productos.data ?? []}
        departamentos={departamentos.data ?? []}
        areas={areas.data ?? []}
      />
    </section>
  );
}

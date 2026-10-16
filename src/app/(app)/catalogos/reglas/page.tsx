import { createClient } from "@/lib/supabase/server";
import { cargarReglas } from "@/lib/sugeridos";
import { ReglasCliente } from "./reglas-cliente";

export const dynamic = "force-dynamic";

export default async function ReglasPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>;
}) {
  const { producto } = await searchParams;
  const supabase = await createClient();

  const [productos, sucursales, reglas] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, tamano, categoria")
      .eq("activo", true)
      .order("nombre")
      .order("tamano"),
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("activa", true)
      .order("id"),
    cargarReglas(supabase),
  ]);

  const idInicial = parseInt(producto ?? "", 10);

  return (
    <section className="flex flex-col gap-5 py-2">
      <ReglasCliente
        productos={productos.data ?? []}
        sucursales={sucursales.data ?? []}
        reglas={reglas}
        productoInicial={Number.isFinite(idInicial) ? idInicial : null}
      />
    </section>
  );
}

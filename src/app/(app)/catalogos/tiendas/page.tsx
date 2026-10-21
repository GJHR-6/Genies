import { createClient } from "@/lib/supabase/server";
import { TiendasCliente } from "./tiendas-cliente";

export const dynamic = "force-dynamic";

export default async function TiendasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sucursales")
    .select("id, nombre, es_principal, colores_decoracion")
    .eq("activa", true)
    .order("id");

  return (
    <section className="flex flex-col gap-5 py-2">
      <TiendasCliente tiendas={data ?? []} />
    </section>
  );
}

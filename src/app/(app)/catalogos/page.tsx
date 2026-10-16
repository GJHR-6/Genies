import { createClient } from "@/lib/supabase/server";
import { GRUPO_CATALOGOS, type ClaveCatalogo } from "@/lib/grupos";
import { TarjetasGrupo, type EstadoTarjeta } from "@/components/tarjetas-grupo";

export const dynamic = "force-dynamic";

export default async function CatalogosPage() {
  const supabase = await createClient();

  const [productos, reglas, pasteleras, areas, departamentos, usuarios] =
    await Promise.all([
      supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("activo", true),
      supabase
        .from("reglas_sugerido")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("pasteleras")
        .select("id", { count: "exact", head: true })
        .eq("activa", true),
      supabase
        .from("areas_produccion")
        .select("id", { count: "exact", head: true })
        .eq("activa", true),
      supabase
        .from("departamentos")
        .select("id", { count: "exact", head: true })
        .eq("activo", true),
      supabase.from("perfiles").select("user_id", { count: "exact", head: true }),
    ]);

  const estados: Record<ClaveCatalogo, EstadoTarjeta> = {
    productos: { texto: `${productos.count ?? 0} activos` },
    reglas: { texto: `${reglas.count ?? 0} objetivos` },
    pasteleras: { texto: `${pasteleras.count ?? 0} activas` },
    areas: { texto: `${areas.count ?? 0} áreas` },
    departamentos: { texto: `${departamentos.count ?? 0} activos` },
    usuarios: { texto: `${usuarios.count ?? 0} cuentas` },
  };

  return (
    <section className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-2xl font-bold">Catálogos</h1>
        <p className="text-sm text-muted-foreground">
          Datos que cambian poco. Tocá la tarjeta de lo que querés revisar o
          cambiar; los cambios se aplican desde el próximo cuadro.
        </p>
      </div>
      <TarjetasGrupo secciones={GRUPO_CATALOGOS.secciones} estados={estados} />
    </section>
  );
}

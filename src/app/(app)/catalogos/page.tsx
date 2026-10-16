import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SECCIONES, type ClaveSeccion } from "./_componentes/secciones";

export const dynamic = "force-dynamic";

export default async function CatalogosPage() {
  const supabase = await createClient();

  const [productos, reglas, areas, departamentos, usuarios] = await Promise.all([
    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("activo", true),
    supabase.from("reglas_sugerido").select("id", { count: "exact", head: true }),
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

  const conteos: Record<ClaveSeccion, string> = {
    productos: `${productos.count ?? 0} activos`,
    reglas: `${reglas.count ?? 0} objetivos`,
    areas: `${areas.count ?? 0} áreas`,
    departamentos: `${departamentos.count ?? 0} activos`,
    usuarios: `${usuarios.count ?? 0} cuentas`,
  };

  return (
    <section className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-2xl font-bold">Catálogos</h1>
        <p className="text-sm text-muted-foreground">
          Elegí qué querés revisar o cambiar. Los cambios se aplican desde el
          próximo cuadro de producción.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECCIONES.map((s) => {
          const Icono = s.icono;
          return (
            <Link
              key={s.clave}
              href={s.href}
              className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
                    s.color
                  )}
                >
                  <Icono className="size-7" />
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {conteos[s.clave]}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{s.titulo}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.descripcion}
                </p>
              </div>
              <span className="mt-auto text-sm font-semibold text-primary">
                Abrir →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

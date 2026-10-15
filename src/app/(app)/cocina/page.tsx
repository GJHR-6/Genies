import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { cargarReparto, type DatosReparto } from "@/lib/asignaciones";
import { CocinaCliente } from "./cocina-cliente";

export const dynamic = "force-dynamic";

/** Tablet de cocina (Principal): cada pastelera ve y marca su trabajo. */
export default async function CocinaPage() {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "principal" && perfil?.rol !== "admin") {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Cocina</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          La pantalla de cocina se usa en la tablet de Principal.
        </p>
      </section>
    );
  }

  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  let datos: DatosReparto;
  try {
    datos = await cargarReparto(supabase, fecha);
  } catch {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Cocina</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Revisá la conexión y recargá.
        </p>
      </section>
    );
  }

  return (
    <CocinaCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      datos={datos}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { cargarSugeridosDelDia, type SugeridosDelDia } from "@/lib/sugeridos";
import { SugeridosCliente } from "./sugeridos-cliente";

export const dynamic = "force-dynamic";

export default async function SugeridosPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  let dia: SugeridosDelDia | null = null;
  try {
    dia = await cargarSugeridosDelDia(supabase, fecha);
  } catch {
    dia = null;
  }

  if (!dia) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Sugeridos</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página.
        </p>
      </section>
    );
  }

  return (
    <SugeridosCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      productos={dia.productos}
      sucursales={dia.sucursales}
      celdasIniciales={dia.celdas}
    />
  );
}

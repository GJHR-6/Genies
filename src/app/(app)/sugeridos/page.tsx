import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { cargarSugeridosDelDia, type SugeridosDelDia } from "@/lib/sugeridos";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
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
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="sugeridos" />
        <Aviso tipo="error">
          No se pudieron cargar los sugeridos. Revisá que haya internet y
          recargá la página.
        </Aviso>
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

import { obtenerPerfil } from "@/lib/supabase/perfil";

/** "Hoy" del negocio, en la zona horaria de Honduras. */
function hoyTegucigalpa(): string {
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "full",
    timeZone: "America/Tegucigalpa",
  }).format(new Date());
}

export default async function CapturaPage() {
  const perfil = await obtenerPerfil();

  return (
    <section className="space-y-2">
      <h1 className="text-xl font-bold">Captura del día</h1>
      <p className="text-sm text-muted-foreground">
        {perfil?.sucursalNombre ?? "Sin sucursal asignada"} · {hoyTegucigalpa()}
      </p>
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        La captura diaria se construye en el hito M3.
      </p>
    </section>
  );
}

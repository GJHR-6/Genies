import { createClient } from "@/lib/supabase/server";
import { DepartamentosCliente } from "./departamentos-cliente";

export const dynamic = "force-dynamic";

export default async function DepartamentosPage() {
  const supabase = await createClient();

  const [departamentos, productos] = await Promise.all([
    supabase.from("departamentos").select("id, nombre, activo").order("nombre"),
    supabase.from("productos").select("departamento_id").eq("activo", true),
  ]);

  const conteo: Record<number, number> = {};
  for (const p of productos.data ?? []) {
    if (p.departamento_id !== null)
      conteo[p.departamento_id] = (conteo[p.departamento_id] ?? 0) + 1;
  }

  return (
    <section className="flex flex-col gap-5 py-2">
      <DepartamentosCliente
        departamentos={departamentos.data ?? []}
        productosPorDepto={conteo}
      />
    </section>
  );
}

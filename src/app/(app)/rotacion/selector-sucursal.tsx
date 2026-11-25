"use client";
import { useRouter } from "next/navigation";

export function SelectorSucursal({
  sucursales,
  seleccionada,
}: {
  sucursales: { id: number; nombre: string }[];
  seleccionada: number | null;
}) {
  const router = useRouter();
  return (
    <select
      value={seleccionada ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/rotacion?sucursal=${v}` : "/rotacion");
      }}
      className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-xs"
      aria-label="Filtrar por sucursal"
    >
      <option value="">Todas las sucursales</option>
      {sucursales.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  );
}

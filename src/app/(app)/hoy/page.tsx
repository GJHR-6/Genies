import Link from "next/link";
import {
  CircleCheck,
  ClipboardList,
  Info,
  Store,
  TableProperties,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { colorDelDia } from "@/lib/color-dia";
import { GRUPO_HOY, type ClaveHoy } from "@/lib/grupos";
import { pasoDelDia, saludo } from "@/lib/paso-del-dia";
import { ChipColorDia } from "@/components/color-dia";
import { TarjetasGrupo, type EstadoTarjeta } from "@/components/tarjetas-grupo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Portada del admin: el trabajo del día en tarjetas independientes. */
export default async function HoyPage() {
  const supabase = await createClient();
  const perfil = await obtenerPerfil();
  const fecha = hoyTegucigalpa();
  const color = colorDelDia(fecha);

  const [sucursales, cierres, ajustes, plan] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id", { count: "exact", head: true })
      .eq("activa", true),
    supabase.from("cierres_dia").select("estado").eq("fecha", fecha),
    supabase
      .from("movimientos_diarios")
      .select("id", { count: "exact", head: true })
      .eq("fecha", fecha)
      .not("sugerido_override", "is", null),
    supabase.from("planes_dia").select("generado_at").eq("fecha", fecha).maybeSingle(),
  ]);

  const tiendasTotal = sucursales.count ?? 0;
  const tiendasCerradas = (cierres.data ?? []).filter(
    (c) => c.estado === "cerrado"
  ).length;
  const repartoHecho = plan.data !== null;

  const paso = pasoDelDia({
    esDomingo: !color,
    tiendasTotal,
    tiendasCerradas,
    repartoHecho,
  });

  const todasCerradas = tiendasCerradas >= tiendasTotal && tiendasTotal > 0;
  const nAjustes = ajustes.count ?? 0;
  const estados: Record<ClaveHoy, EstadoTarjeta> = {
    tiendas: {
      texto: `${tiendasCerradas} de ${tiendasTotal} terminaron`,
      tono: todasCerradas ? "exito" : "aviso",
    },
    sugeridos: {
      texto:
        nAjustes === 0
          ? "Sin cambios a mano"
          : nAjustes === 1
            ? "1 número cambiado a mano"
            : `${nAjustes} números cambiados a mano`,
    },
    cuadros: color
      ? todasCerradas
        ? { texto: "Listos para imprimir", tono: "exito" }
        : { texto: "Se pueden ver; aún faltan tiendas", tono: "aviso" }
      : { texto: "Domingo: sin cuadros" },
    reparto: repartoHecho
      ? { texto: "Hecho: listo para imprimir", tono: "exito" }
      : { texto: "Todavía no se hace" },
  };

  const IconoPaso =
    paso.tono === "exito" ? CircleCheck : paso.tono === "aviso" ? TriangleAlert : Info;

  return (
    <section className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-2xl font-bold">
          {saludo()}
          {perfil?.nombre ? `, ${perfil.nombre.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="first-letter:uppercase">{formatoLargo(fecha)}</span>
          <ChipColorDia fecha={fecha} conEtiqueta />
        </p>
      </div>

      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4",
          paso.tono === "exito" && "border-exito/30 bg-exito/10",
          paso.tono === "aviso" && "border-aviso/30 bg-aviso/10",
          paso.tono === "info" && "bg-muted/50"
        )}
      >
        <IconoPaso
          className={cn(
            "mt-0.5 size-6 shrink-0",
            paso.tono === "exito" && "text-exito",
            paso.tono === "aviso" && "text-aviso",
            paso.tono === "info" && "text-muted-foreground"
          )}
        />
        <div>
          <p className="font-semibold">{paso.titulo}</p>
          <p className="text-sm text-muted-foreground">{paso.mensaje}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          El trabajo de hoy · tocá cualquier tarjeta, en el orden que quieras
        </h2>
        <TarjetasGrupo
          secciones={GRUPO_HOY.secciones}
          estados={estados}
          destacada={paso.destacada}
        />
      </div>

      {color && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Hojas para imprimir · iguales al Excel, cada una en su página
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {HOJAS.map((h) => (
              <BotonHoja
                key={h.href}
                {...h}
                pendiente={h.href === "/asignar/imprimir" && !repartoHecho}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const HOJAS: { href: string; titulo: string; para: string; icono: LucideIcon }[] = [
  {
    href: "/cuadros/despacho?hoja=completa",
    titulo: "Hoja completa",
    para: "Inventario diario como en el Excel, con DEC, PROD y libras por batida.",
    icono: TableProperties,
  },
  {
    href: "/cuadros",
    titulo: "Cuadros de producción",
    para: "Una hoja por área, con lo que hay que hornear y decorar.",
    icono: ClipboardList,
  },
  {
    href: "/asignar/imprimir",
    titulo: "Hoja de cada pastelera",
    para: "Lo que le toca a cada una, por batida, con casillas para marcar.",
    icono: Users,
  },
  {
    href: "/cuadros/despacho?hoja=tiendas",
    titulo: "Hoja de cada tienda",
    para: "Lo que se le manda a cada tienda, para tachar al empacar.",
    icono: Store,
  },
];

function BotonHoja({
  href,
  titulo,
  para,
  icono: Icono,
  pendiente,
}: (typeof HOJAS)[number] & { pendiente: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Icono className="size-6" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold">{titulo}</span>
        <span className="text-sm text-muted-foreground">
          {pendiente ? "Primero hacé el reparto." : para}
        </span>
      </span>
    </Link>
  );
}

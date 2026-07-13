import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, diaAnterior, formatoLargo } from "@/lib/fechas";
import { colorDelDia } from "@/lib/color-dia";
import { ChipColorDia } from "@/components/color-dia";
import {
  estimarLotes,
  lotesRezagados,
  accionPorDias,
  DIAS_PRIORIDAD,
  DIAS_REGRESAR,
  VENTANA_DIAS,
  type IngresoDia,
  type LoteEstimado,
} from "@/lib/rotacion";

export const dynamic = "force-dynamic";

type ProductoRezagado = {
  productoId: number;
  nombre: string;
  tamano: string | null;
  saldo: number;
  lotes: LoteEstimado[];
};

const ETIQUETA_ACCION = {
  prioridad: {
    texto: "Prioridad de venta",
    clase: "bg-[#B45309]/10 text-[#B45309]",
  },
  regresar: {
    texto: "Regresar a Principal",
    clase: "bg-[#B91C1C]/10 text-[#B91C1C]",
  },
} as const;

/** "viernes 10 jul" para una fecha ISO, sin corrimiento de zona. */
function formatoDia(fechaIso: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${fechaIso}T00:00:00Z`));
}

function PastillaColor({ fechaIso }: { fechaIso: string | null }) {
  const color = fechaIso ? colorDelDia(fechaIso) : null;
  if (!color) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {fechaIso ? "Domingo" : `${VENTANA_DIAS}+ días`}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: color.fondo, color: color.texto }}
    >
      {color.nombre}
    </span>
  );
}

export default async function RotacionPage() {
  const supabase = await createClient();
  const hoy = hoyTegucigalpa();

  // Ventana de fechas: hoy y los 6 días anteriores.
  const fechas: string[] = [hoy];
  for (let i = 1; i < VENTANA_DIAS; i++) {
    fechas.push(diaAnterior(fechas[i - 1]));
  }
  const [, ayer, ...previas] = fechas;

  let productos: {
    id: number;
    nombre: string;
    tamano: string | null;
  }[];
  let sucursales: { id: number; nombre: string }[];
  let filasHoy: {
    sucursal_id: number;
    producto_id: number;
    saldo_inicial: number;
    ingreso: number;
    devolucion: number;
    saldo_final: number | null;
  }[];
  let filasAyer: typeof filasHoy;
  let ingresosPrevios: {
    fecha: string;
    sucursal_id: number;
    producto_id: number;
    ingreso: number;
  }[];
  try {
    // Una consulta por día para no exceder el límite de filas por petición.
    const [productosRes, sucursalesRes, hoyRes, ayerRes, ...previasRes] =
      await Promise.all([
        supabase
          .from("productos")
          .select("id, nombre, tamano")
          .eq("activo", true),
        supabase
          .from("sucursales")
          .select("id, nombre")
          .eq("activa", true)
          .order("id"),
        supabase
          .from("movimientos_diarios")
          .select(
            "sucursal_id, producto_id, saldo_inicial, ingreso, devolucion, saldo_final"
          )
          .eq("fecha", hoy),
        supabase
          .from("movimientos_diarios")
          .select(
            "sucursal_id, producto_id, saldo_inicial, ingreso, devolucion, saldo_final"
          )
          .eq("fecha", ayer),
        ...previas.map((f) =>
          supabase
            .from("movimientos_diarios")
            .select("fecha, sucursal_id, producto_id, ingreso")
            .eq("fecha", f)
            .gt("ingreso", 0)
        ),
      ]);
    const error =
      productosRes.error ??
      sucursalesRes.error ??
      hoyRes.error ??
      ayerRes.error ??
      previasRes.find((r) => r.error)?.error;
    if (error) throw new Error(error.message);
    productos = productosRes.data ?? [];
    sucursales = sucursalesRes.data ?? [];
    filasHoy = hoyRes.data ?? [];
    filasAyer = ayerRes.data ?? [];
    ingresosPrevios = previasRes.flatMap((r) => r.data ?? []);
  } catch {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Rotación de producto</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página.
        </p>
      </section>
    );
  }

  const nombreProducto = new Map(productos.map((p) => [p.id, p]));

  // Saldo actual por producto × sucursal: la captura de hoy o, si aún no
  // hay, el saldo final de ayer.
  const saldos = new Map<string, number>();
  for (const m of filasAyer) {
    const saldo =
      m.saldo_final ??
      Math.max(m.saldo_inicial + m.ingreso - m.devolucion, 0);
    saldos.set(`${m.producto_id}-${m.sucursal_id}`, saldo);
  }
  for (const m of filasHoy) {
    const saldo =
      m.saldo_final ??
      Math.max(m.saldo_inicial + m.ingreso - m.devolucion, 0);
    saldos.set(`${m.producto_id}-${m.sucursal_id}`, saldo);
  }

  // Ingresos de la ventana por producto × sucursal (para fechar el saldo).
  const ingresos = new Map<string, IngresoDia[]>();
  const agregarIngreso = (
    clave: string,
    fecha: string,
    ingreso: number
  ): void => {
    if (ingreso <= 0) return;
    const lista = ingresos.get(clave) ?? [];
    lista.push({ fecha, ingreso });
    ingresos.set(clave, lista);
  };
  for (const m of filasHoy) {
    agregarIngreso(`${m.producto_id}-${m.sucursal_id}`, hoy, m.ingreso);
  }
  for (const m of filasAyer) {
    agregarIngreso(`${m.producto_id}-${m.sucursal_id}`, ayer, m.ingreso);
  }
  for (const m of ingresosPrevios) {
    agregarIngreso(`${m.producto_id}-${m.sucursal_id}`, m.fecha, m.ingreso);
  }

  // Productos con pastel rezagado por sucursal.
  const porSucursal = new Map<number, ProductoRezagado[]>();
  let unidadesPrioridad = 0;
  let unidadesRegresar = 0;
  for (const [clave, saldo] of saldos) {
    if (saldo <= 0) continue;
    const [productoId, sucursalId] = clave.split("-").map(Number);
    const producto = nombreProducto.get(productoId);
    if (!producto) continue;
    const rezagados = lotesRezagados(
      estimarLotes(saldo, hoy, ingresos.get(clave) ?? [])
    );
    if (rezagados.length === 0) continue;
    const lista = porSucursal.get(sucursalId) ?? [];
    lista.push({
      productoId,
      nombre: producto.nombre,
      tamano: producto.tamano,
      saldo,
      lotes: rezagados,
    });
    porSucursal.set(sucursalId, lista);
    for (const l of rezagados) {
      if (accionPorDias(l.dias) === "regresar") unidadesRegresar += l.unidades;
      else unidadesPrioridad += l.unidades;
    }
  }
  for (const lista of porSucursal.values()) {
    lista.sort(
      (a, b) => b.lotes[0].dias - a.lotes[0].dias || b.saldo - a.saldo
    );
  }
  const gruposConAlerta = sucursales.filter(
    (s) => (porSucursal.get(s.id) ?? []).length > 0
  );

  // Leyenda: colores de lunes a sábado (semana que termina hoy o la próxima).
  const semanaLeyenda: string[] = [];
  for (let f = hoy, i = 0; i < VENTANA_DIAS; i++, f = diaAnterior(f)) {
    if (colorDelDia(f)) semanaLeyenda.unshift(f);
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Rotación de producto</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{formatoLargo(hoy)}</span>
          <ChipColorDia fecha={hoy} conEtiqueta />
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm">
        <p>
          Cada pastel lleva el color del día en que se produjo. Con{" "}
          <strong>{DIAS_PRIORIDAD} días</strong> en tienda tiene{" "}
          <strong className="text-[#B45309]">prioridad de venta</strong>; con{" "}
          <strong>{DIAS_REGRESAR} días o más</strong> se{" "}
          <strong className="text-[#B91C1C]">
            regresa a Principal para cambio
          </strong>
          .
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {semanaLeyenda.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <PastillaColor fechaIso={f} />
              {new Intl.DateTimeFormat("es-HN", {
                weekday: "short",
                timeZone: "UTC",
              }).format(new Date(`${f}T00:00:00Z`))}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-2xl font-bold tabular-nums text-[#B91C1C]">
            {unidadesRegresar}
          </p>
          <p className="text-xs text-muted-foreground">
            unidades para regresar a Principal ({DIAS_REGRESAR}+ días)
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-2xl font-bold tabular-nums text-[#B45309]">
            {unidadesPrioridad}
          </p>
          <p className="text-xs text-muted-foreground">
            unidades con prioridad de venta ({DIAS_PRIORIDAD} días)
          </p>
        </div>
      </div>

      {gruposConAlerta.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sin pastel rezagado: todo el inventario a la vista tiene menos de{" "}
          {DIAS_PRIORIDAD} días.
        </p>
      )}

      {gruposConAlerta.map((s) => (
        <article key={s.id} className="rounded-lg border bg-card">
          <header className="border-b px-4 py-2.5">
            <h2 className="font-semibold">{s.nombre}</h2>
          </header>
          <ul className="divide-y">
            {(porSucursal.get(s.id) ?? []).map((p) => (
              <li key={p.productoId} className="space-y-1.5 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {p.nombre}
                    {p.tamano ? ` · ${p.tamano}` : ""}
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    en tienda: <span className="tabular-nums">{p.saldo}</span>
                  </p>
                </div>
                {p.lotes.map((l) => {
                  const accion = accionPorDias(l.dias);
                  if (accion === "fresco") return null;
                  const etiqueta = ETIQUETA_ACCION[accion];
                  return (
                    <div
                      key={l.fechaProduccion ?? "viejo"}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                    >
                      <PastillaColor fechaIso={l.fechaProduccion} />
                      <span className="text-muted-foreground">
                        {l.fechaProduccion
                          ? formatoDia(l.fechaProduccion)
                          : "más de una semana"}{" "}
                        ·{" "}
                        <span className="tabular-nums">
                          {l.unidades}{" "}
                          {l.unidades === 1 ? "unidad" : "unidades"}
                        </span>{" "}
                        ·{" "}
                        {l.dias >= VENTANA_DIAS
                          ? `${VENTANA_DIAS}+ días`
                          : `${l.dias} días`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${etiqueta.clase}`}
                      >
                        {etiqueta.texto}
                      </span>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </article>
      ))}

      <p className="text-xs text-muted-foreground">
        La edad se estima con los ingresos de los últimos {VENTANA_DIAS} días:
        vendiendo siempre lo más viejo primero, el saldo que no alcanza a
        cubrirse con ingresos recientes corresponde a producción anterior.
      </p>
    </section>
  );
}

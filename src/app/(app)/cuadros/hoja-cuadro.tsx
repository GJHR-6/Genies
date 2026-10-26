"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Aviso } from "@/components/encabezado-seccion";
import type { CeldaSugerido, ProductoSugerido } from "@/lib/sugeridos";
import { filaHojaCompleta } from "@/lib/hoja-completa";
import { cn } from "@/lib/utils";

type Sucursal = { id: number; nombre: string };

/** Lo que Principal anotó hoy, para DECO / SIN DECO / INV/TOTAL y CM. */
export type DatosPrincipal = {
  id: number | null;
  sinDecorar: Record<number, number>;
  decorado: Record<number, number>;
  saldo: Record<number, number>;
  cambios: Record<string, number>;
};

type Props = {
  fecha: string;
  /** Ya vienen en el orden del Excel. */
  productos: ProductoSugerido[];
  sucursales: Sucursal[];
  celdas: Record<string, CeldaSugerido>;
  principal: DatosPrincipal;
};

/** Qué casilla se está escribiendo: lo que va a una sucursal, o DECO / SIN DECO. */
type Edicion =
  | { tipo: "mandar"; clave: string; valor: string }
  | { tipo: "decorado" | "sin_decorar"; productoId: number; valor: string }
  | null;

const CAMPO_NUMERO = "h-8 w-16 text-right tabular-nums";

/**
 * Cuadro completo, igual que INVENTARIO DIARIO del Excel:
 * PRODUCTO · DECO · SIN DECO · INV/TOTAL · (tienda · CM)… · SALDO ·
 * Principal · Sugerido. DECO y SIN DECO se guardan en el inventario de
 * Principal de hoy; lo de cada tienda es su sugerido (override). El SALDO
 * se recalcula al instante.
 */
export function HojaCuadro({ fecha, productos, sucursales, celdas: celdasProp, principal }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [celdas, setCeldas] = useState(celdasProp);
  const [decorado, setDecorado] = useState(principal.decorado);
  const [sinDecorar, setSinDecorar] = useState(principal.sinDecorar);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [errorGuardado, setErrorGuardado] = useState(false);

  // Al recargar (router.refresh) llegan los datos frescos del servidor.
  useEffect(() => setCeldas(celdasProp), [celdasProp]);
  useEffect(() => setDecorado(principal.decorado), [principal.decorado]);
  useEffect(() => setSinDecorar(principal.sinDecorar), [principal.sinDecorar]);

  const usuario = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  /** Actualiza la fila de hoy; si no existe todavía, la crea con ese dato. */
  const guardarFila = async (
    sucursalId: number,
    productoId: number,
    cambios: { sugerido_override?: number | null; decorado?: number; sin_decorar?: number }
  ) => {
    const updated_by = await usuario();
    const updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("movimientos_diarios")
      .update({ ...cambios, updated_at, updated_by })
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursalId)
      .eq("producto_id", productoId)
      .select("id");
    if (error) throw new Error(error.message);
    if ((data ?? []).length > 0) return;
    if (cambios.sugerido_override === null) return;
    // La sucursal aún no capturó ese producto: crear la fila con el dato.
    const { error: errInserta } = await supabase.from("movimientos_diarios").insert({
      fecha,
      sucursal_id: sucursalId,
      producto_id: productoId,
      saldo_inicial: 0,
      ingreso: 0,
      devolucion: 0,
      pedido: 0,
      decorado: 0,
      sin_decorar: 0,
      ...cambios,
      updated_at,
      updated_by,
    });
    if (errInserta) throw new Error(errInserta.message);
  };

  const mutacion = useMutation({
    mutationFn: async (e: NonNullable<Edicion> & { numero: number | null }) => {
      if (e.tipo === "mandar") {
        const [productoId, sucursalId] = e.clave.split("-").map(Number);
        await guardarFila(sucursalId, productoId, { sugerido_override: e.numero });
      } else {
        if (principal.id === null) throw new Error("Sin Principal");
        await guardarFila(principal.id, e.productoId, { [e.tipo]: e.numero ?? 0 });
      }
    },
    onSuccess: (_d, e) => {
      setErrorGuardado(false);
      if (e.tipo === "mandar") {
        setCeldas((prev) => {
          const celda = prev[e.clave];
          if (!celda) return prev;
          return {
            ...prev,
            [e.clave]: {
              ...celda,
              esOverride: e.numero !== null,
              conCaptura: celda.conCaptura || e.numero !== null,
              sugerido: e.numero ?? Math.max(celda.objetivo - (celda.saldo ?? 0), 0),
            },
          };
        });
      } else {
        const poner = e.tipo === "decorado" ? setDecorado : setSinDecorar;
        poner((prev) => {
          const { [e.productoId]: _quitado, ...resto } = prev;
          void _quitado;
          return e.numero ? { ...resto, [e.productoId]: e.numero } : resto;
        });
      }
      // Los cuadros por área (Hornear) salen del servidor.
      router.refresh();
    },
    onError: () => setErrorGuardado(true),
  });

  const confirmar = () => {
    if (!edicion) return;
    const texto = edicion.valor.trim();
    const numero = texto === "" ? null : parseInt(texto, 10);
    setEdicion(null);
    if (numero !== null && (!Number.isFinite(numero) || numero < 0)) return;
    if (edicion.tipo === "mandar") {
      const celda = celdas[edicion.clave];
      if (!celda) return;
      // Sin cambios: mismo override, o se limpió sin haber override.
      if (numero === null && !celda.esOverride) return;
      if (numero !== null && celda.esOverride && numero === celda.sugerido) return;
    } else {
      const actual = (edicion.tipo === "decorado" ? decorado : sinDecorar)[edicion.productoId] ?? 0;
      if ((numero ?? 0) === actual) return;
    }
    mutacion.mutate({ ...edicion, numero });
  };

  // Como INVENTARIO DIARIO: Principal no es columna de tienda (es el
  // INV/TOTAL); va al final, antes del total.
  const tiendas = sucursales.filter((x) => x.id !== principal.id);
  const sucursalPrincipal = sucursales.find((x) => x.id === principal.id) ?? null;

  const grupos = useMemo(() => {
    const porCategoria = new Map<string, ProductoSugerido[]>();
    for (const p of productos) {
      const cat = p.categoria ?? "OTROS";
      const lista = porCategoria.get(cat);
      if (lista) lista.push(p);
      else porCategoria.set(cat, [p]);
    }
    return [...porCategoria.entries()];
  }, [productos]);

  const edicionProps = { edicion, setEdicion, confirmar };
  const columnas = 4 + tiendas.length * 2 + 1 + (sucursalPrincipal ? 1 : 0) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 rounded-2xl border bg-muted/40 p-4 text-sm sm:grid-cols-3 print:hidden">
        <p>
          <span className="font-semibold">1. Lo que hay en Principal.</span>{" "}
          <span className="text-muted-foreground">
            Escribí DECO y SIN DECO (se guardan en el inventario de Principal de
            hoy). INV/TOTAL = DECO + SIN DECO.
          </span>
        </p>
        <p>
          <span className="font-semibold">2. Lo que va a cada tienda.</span>{" "}
          <span className="text-muted-foreground">
            Ya viene calculado (objetivo − lo que la tienda tiene). Tocá un
            número para cambiarlo y presioná Enter; vacío = vuelve al calculado.
            CM = cambio de la tienda.
          </span>
        </p>
        <p>
          <span className="font-semibold">3. Revisá el SALDO.</span>{" "}
          <span className="text-muted-foreground">
            INV/TOTAL + CM − lo que se manda. En{" "}
            <span className="font-semibold text-destructive">rojo</span>, falta
            producto: hay que hornear o mandar menos.
          </span>
        </p>
        <p className="text-muted-foreground sm:col-span-3">
          <span className="font-semibold text-primary">• 12</span> = cambiado a
          mano · <span className="italic">12</span> en cursiva = la tienda aún no
          anota ese producto · — = la tienda no lleva ese producto
        </p>
      </div>

      {errorGuardado && (
        <Aviso tipo="error" className="print:hidden">
          No se pudo guardar el cambio. Revisá que haya internet e intentá de
          nuevo.
        </Aviso>
      )}

      <div className="overflow-x-auto rounded-lg border print:overflow-visible print:rounded-none print:border-0">
        <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0 print:text-[9.5px]">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase print:border-black print:bg-transparent">
              <th className="sticky left-0 z-[1] shadow-[1px_0_0_var(--border)] bg-background px-3 py-2 text-left font-semibold print:static">
                Producto
              </th>
              <th className="border-l px-2 py-2 text-right font-semibold">Deco</th>
              <th className="px-2 py-2 text-right font-semibold">Sin deco</th>
              <th className="px-2 py-2 text-right font-semibold">Inv/Total</th>
              {tiendas.map((t) => (
                <Fragment key={t.id}>
                  <th className="border-l px-2 py-2 text-right font-semibold">{t.nombre}</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">CM</th>
                </Fragment>
              ))}
              <th className="border-l px-2 py-2 text-right font-semibold">Saldo</th>
              {sucursalPrincipal && (
                <th
                  className="border-l px-2 py-2 text-right font-semibold"
                  title="Lo que necesita la vitrina de Principal"
                >
                  {sucursalPrincipal.nombre}
                </th>
              )}
              <th
                className="border-l px-2 py-2 text-right font-semibold"
                title="Suma de todas las sucursales"
              >
                Sugerido
              </th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(([categoria, lista]) => (
              <Fragment key={categoria}>
                <tr className="border-b bg-muted/30 print:border-black/60 print:bg-black/10">
                  <td colSpan={columnas} className="px-3 py-1.5 text-xs font-bold uppercase">
                    {/* El nombre de la sección queda a la vista al mover la tabla de lado. */}
                    <span className="sticky left-3 print:static">{categoria}</span>
                  </td>
                </tr>
                {lista.map((p) => {
                  const fila = filaHojaCompleta(
                    {
                      celdas,
                      sinDecorar,
                      decorado,
                      cambios: principal.cambios,
                      saldoPrincipal: principal.saldo,
                      principalId: principal.id,
                    },
                    p,
                    tiendas
                  );
                  const total = sucursales.reduce(
                    (t, x) => t + (celdas[`${p.id}-${x.id}`]?.sugerido ?? 0),
                    0
                  );
                  const nombre = `${p.nombre}${p.tamano ? ` ${p.tamano}` : ""}`;
                  const editablePrincipal = p.lleva_decoracion && principal.id !== null;
                  return (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20 print:border-black/40">
                      <td className="sticky left-0 z-[1] shadow-[1px_0_0_var(--border)] bg-background px-3 py-1.5 font-medium print:static">
                        {p.nombre}
                        {p.tamano ? ` · ${p.tamano}` : ""}
                      </td>
                      {editablePrincipal ? (
                        <>
                          <CeldaPrincipal
                            campo="decorado"
                            producto={p.id}
                            valor={decorado[p.id] ?? 0}
                            etiqueta={`Deco de ${nombre}`}
                            className="border-l"
                            {...edicionProps}
                          />
                          <CeldaPrincipal
                            campo="sin_decorar"
                            producto={p.id}
                            valor={sinDecorar[p.id] ?? 0}
                            etiqueta={`Sin deco de ${nombre}`}
                            {...edicionProps}
                          />
                        </>
                      ) : (
                        <>
                          <Numero
                            valor={fila.deco}
                            className="border-l"
                            titulo="No lleva decoración: es el saldo de Principal (sale de su inventario)"
                          />
                          <Numero valor={null} />
                        </>
                      )}
                      <Numero valor={fila.invTotal} className="font-semibold" />
                      {tiendas.map((t, i) => (
                        <Fragment key={t.id}>
                          <CeldaMandar
                            clave={`${p.id}-${t.id}`}
                            celda={celdas[`${p.id}-${t.id}`]}
                            etiqueta={`Sugerido de ${nombre} en ${t.nombre}`}
                            className="border-l"
                            {...edicionProps}
                          />
                          <Numero valor={fila.tiendas[i].cm} apagado />
                        </Fragment>
                      ))}
                      <td
                        className={cn(
                          "border-l px-2 py-1.5 text-right font-bold tabular-nums",
                          fila.saldo < 0
                            ? "bg-destructive/10 text-destructive print:bg-transparent print:text-black"
                            : "text-exito print:text-black"
                        )}
                        title={fila.saldo < 0 ? `Faltan ${-fila.saldo}` : "Alcanza con lo que hay en Principal"}
                      >
                        {fila.saldo}
                      </td>
                      {sucursalPrincipal && (
                        <CeldaMandar
                          clave={`${p.id}-${sucursalPrincipal.id}`}
                          celda={celdas[`${p.id}-${sucursalPrincipal.id}`]}
                          etiqueta={`Sugerido de ${nombre} en ${sucursalPrincipal.nombre}`}
                          className="border-l"
                          {...edicionProps}
                        />
                      )}
                      <td className="border-l px-2 py-1.5 text-right font-semibold tabular-nums">
                        {total || ""}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Número de solo lectura; vacío si no hay dato o es 0. */
function Numero({
  valor,
  className,
  apagado,
  titulo,
}: {
  valor: number | null;
  className?: string;
  apagado?: boolean;
  titulo?: string;
}) {
  return (
    <td
      className={cn("px-2 py-1.5 text-right tabular-nums", apagado && "text-muted-foreground", className)}
      title={titulo}
    >
      {valor ? valor : ""}
    </td>
  );
}

type EdicionProps = {
  edicion: Edicion;
  setEdicion: (e: Edicion) => void;
  confirmar: () => void;
};

function CampoNumero({
  valor,
  onChange,
  etiqueta,
  confirmar,
  cancelar,
}: {
  valor: string;
  onChange: (v: string) => void;
  etiqueta: string;
  confirmar: () => void;
  cancelar: () => void;
}) {
  return (
    <Input
      autoFocus
      inputMode="numeric"
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
        if (e.key === "Escape") cancelar();
      }}
      className={CAMPO_NUMERO}
      aria-label={etiqueta}
    />
  );
}

const BOTON_CELDA =
  "w-full min-w-12 rounded border border-dashed border-border/70 px-2 py-1 text-right tabular-nums hover:border-primary hover:bg-muted print:border-0";

/** DECO o SIN DECO de Principal: se toca para escribirlo. */
function CeldaPrincipal({
  campo,
  producto,
  valor,
  etiqueta,
  className,
  edicion,
  setEdicion,
  confirmar,
}: EdicionProps & {
  campo: "decorado" | "sin_decorar";
  producto: number;
  valor: number;
  etiqueta: string;
  className?: string;
}) {
  const editando = edicion?.tipo === campo && edicion.productoId === producto;
  return (
    <td className={cn("px-1 py-0.5 text-right", className)}>
      {editando ? (
        <CampoNumero
          valor={edicion.valor}
          onChange={(v) => setEdicion({ tipo: campo, productoId: producto, valor: v })}
          etiqueta={etiqueta}
          confirmar={confirmar}
          cancelar={() => setEdicion(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEdicion({ tipo: campo, productoId: producto, valor: valor ? String(valor) : "" })}
          className={cn(BOTON_CELDA, "min-h-8")}
          aria-label={`${etiqueta}: ${valor}`}
        >
          {valor ? valor : ""}
        </button>
      )}
    </td>
  );
}

/** Lo que se le manda a una sucursal: se toca para cambiarlo. */
function CeldaMandar({
  clave,
  celda,
  etiqueta,
  className,
  edicion,
  setEdicion,
  confirmar,
}: EdicionProps & {
  clave: string;
  celda: CeldaSugerido | undefined;
  etiqueta: string;
  className?: string;
}) {
  if (!celda) {
    return (
      <td
        className={cn("px-2 py-1.5 text-right text-muted-foreground", className)}
        title="Este producto no tiene objetivo para esta tienda"
      >
        —
      </td>
    );
  }
  if (edicion?.tipo === "mandar" && edicion.clave === clave) {
    return (
      <td className={cn("px-1 py-0.5 text-right", className)}>
        <CampoNumero
          valor={edicion.valor}
          onChange={(v) => setEdicion({ tipo: "mandar", clave, valor: v })}
          etiqueta={etiqueta}
          confirmar={confirmar}
          cancelar={() => setEdicion(null)}
        />
      </td>
    );
  }
  return (
    <td className={cn("px-1 py-0.5 text-right", className)}>
      <button
        type="button"
        onClick={() =>
          setEdicion({ tipo: "mandar", clave, valor: celda.esOverride ? String(celda.sugerido) : "" })
        }
        title={
          celda.conCaptura
            ? `Objetivo ${celda.objetivo} − saldo ${celda.saldo ?? 0}`
            : `Sin captura hoy · objetivo ${celda.objetivo}`
        }
        className={cn(
          BOTON_CELDA,
          celda.esOverride ? "font-semibold text-primary" : "",
          celda.conCaptura ? "" : "italic"
        )}
        aria-label={`${etiqueta}: ${celda.sugerido}${celda.esOverride ? " (ajustado)" : ""}`}
      >
        {celda.esOverride ? "• " : ""}
        {celda.sugerido}
      </button>
    </td>
  );
}

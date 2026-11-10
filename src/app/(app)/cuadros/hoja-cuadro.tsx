"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/encabezado-seccion";
import type { CeldaSugerido, ProductoSugerido } from "@/lib/sugeridos";
import {
  SECCIONES_CON_TOTAL,
  cuentaEnTotalSeccion,
  filaHojaCompleta,
  sumarFilas,
  type FilaHojaCompleta,
} from "@/lib/hoja-completa";
import {
  MAX_BATIDAS,
  MAX_LIBRAS_BATIDA,
  batidasDelCuadro,
  batidasUsadas,
  formatoTandas,
  type AjusteBatida,
} from "@/lib/batidas";
import { cn } from "@/lib/utils";
import { PanelBatidas, type CambioBatida } from "./panel-batidas";

type Sucursal = { id: number; nombre: string };

/** Lo que Principal anotó hoy, para DECO / SIN DECO / INV/TOTAL y CM. */
export type DatosPrincipal = {
  id: number | null;
  sinDecorar: Record<number, number>;
  decorado: Record<number, number>;
  /** RESTANTE (sobrantes), a mano mientras se define la fórmula. */
  restante: Record<number, number>;
  saldo: Record<number, number>;
  cambios: Record<string, number>;
};

/**
 * Para DEC / PROD por batida (1–10): lo que se hornea según el reparto
 * (T1–T4), las casillas cambiadas a mano y las libras de masa por unidad.
 */
export type DatosBatidas = {
  prodReparto: Record<number, number[]>;
  ajustes: AjusteBatida[];
  libras: Record<number, number>;
};

const indices = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Libras de cada batida de un producto: lo que se hornea × libras por unidad. */
function librasProducto(
  libras: Record<number, number>,
  prodPorProducto: ReadonlyMap<number, number[]>,
  productoId: number
): number[] | null {
  const lb = libras[productoId];
  if (!lb) return null;
  const prod = prodPorProducto.get(productoId) ?? [];
  return indices(MAX_BATIDAS).map((i) => Math.round((prod[i] ?? 0) * lb * 100) / 100);
}

/** Suma batida por batida. */
function sumarTandas(listas: (readonly number[] | null | undefined)[]): number[] {
  return indices(MAX_BATIDAS).map((i) =>
    Math.round(listas.reduce((t, l) => t + (l?.[i] ?? 0), 0) * 100) / 100
  );
}

/**
 * Qué columnas se ven: Despacho (lo que hay en Principal y lo que va a
 * cada tienda), Producción (sin deco, sugerido, DEC / PROD y libras) o
 * Todo. Al imprimir siempre sale la hoja completa, como el Excel.
 */
type Vista = "despacho" | "produccion" | "todo";
const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: "despacho", etiqueta: "Despacho" },
  { valor: "produccion", etiqueta: "Producción" },
  { valor: "todo", etiqueta: "Todo" },
];
const CLAVE_VISTA = "genies:cuadro-vista";
/** Batidas que se ven aunque no se usen (un día normal). */
const MIN_BATIDAS_VISIBLES = 2;

type Props = {
  fecha: string;
  /** Ya vienen en el orden del Excel. */
  productos: ProductoSugerido[];
  sucursales: Sucursal[];
  celdas: Record<string, CeldaSugerido>;
  principal: DatosPrincipal;
  batidas: DatosBatidas;
  /** Pedido que anotó cada tienda hoy (`${productoId}-${sucursalId}`). */
  pedidos: Record<string, number>;
  /** Ajustes del admin a lo que se manda a cada tienda. */
  mandarOverride: Record<string, number>;
};

/**
 * Qué casilla se está escribiendo: lo que se manda a una tienda (ajuste
 * sobre su pedido), el CM de una tienda, el sugerido de Principal o
 * DECO / SIN DECO. DEC / PROD se escriben en el panel de batidas.
 */
type Edicion =
  | { tipo: "enviar"; clave: string; valor: string }
  | { tipo: "cambio"; clave: string; valor: string }
  | { tipo: "mandar"; clave: string; valor: string }
  | { tipo: "decorado" | "sin_decorar" | "restante"; productoId: number; valor: string }
  | null;

const CAMPO_NUMERO = "h-8 w-16 text-right tabular-nums";

/**
 * Cuadro completo, igual que INVENTARIO DIARIO del Excel:
 * PRODUCTO · DECO · SIN DECO · INV/TOTAL · (tienda · CM)… · SALDO ·
 * Principal · Sugerido. DECO y SIN DECO se guardan en el inventario de
 * Principal de hoy; lo de cada tienda es su sugerido (override). El SALDO
 * se recalcula al instante.
 */
export function HojaCuadro({ fecha, productos, sucursales, celdas: celdasProp, principal, batidas, pedidos, mandarOverride: ajustesProp }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [celdas, setCeldas] = useState(celdasProp);
  const [decorado, setDecorado] = useState(principal.decorado);
  const [sinDecorar, setSinDecorar] = useState(principal.sinDecorar);
  const [restante, setRestante] = useState(principal.restante);
  const [mandarOverride, setMandarOverride] = useState(ajustesProp);
  const [cambios, setCambios] = useState(principal.cambios);
  const [ajustesBatida, setAjustesBatida] = useState(batidas.ajustes);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [panel, setPanel] = useState<number | null>(null);
  const [batidasAgregadas, setBatidasAgregadas] = useState(0);

  // Cada tablet o computadora recuerda la pestaña (si falla, Despacho).
  const [vista, setVista] = useState<Vista>("despacho");
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_VISTA);
      if (VISTAS.some((v) => v.valor === guardada)) {
        setVista(guardada as Vista);
      }
    } catch {
      /* sin almacenamiento: Despacho */
    }
  }, []);
  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* sin almacenamiento: vale solo para esta visita */
    }
  };
  /** Clases de una columna: escondida si no es de la pestaña (al imprimir, sí). */
  const col = (...grupos: Exclude<Vista, "todo">[]) =>
    vista === "todo" || grupos.includes(vista as Exclude<Vista, "todo">)
      ? ""
      : "hidden print:table-cell";

  // Al recargar (router.refresh) llegan los datos frescos del servidor.
  useEffect(() => setCeldas(celdasProp), [celdasProp]);
  useEffect(() => setDecorado(principal.decorado), [principal.decorado]);
  useEffect(() => setSinDecorar(principal.sinDecorar), [principal.sinDecorar]);
  useEffect(() => setRestante(principal.restante), [principal.restante]);
  useEffect(() => setMandarOverride(ajustesProp), [ajustesProp]);
  useEffect(() => setCambios(principal.cambios), [principal.cambios]);
  useEffect(() => setAjustesBatida(batidas.ajustes), [batidas.ajustes]);

  // DEC 1 = sin decorar, DEC 2 = lo que se hornea, PROD = reparto; lo
  // cambiado a mano manda.
  const efectivas = useMemo(
    () =>
      batidasDelCuadro({
        productos,
        prodReparto: new Map(
          Object.entries(batidas.prodReparto).map(([id, fila]) => [Number(id), fila])
        ),
        sinDecorar,
        ajustes: ajustesBatida,
      }),
    [productos, batidas.prodReparto, sinDecorar, ajustesBatida]
  );
  const librasDe = (productoId: number) =>
    librasProducto(batidas.libras, efectivas.prod, productoId);
  // Se ven las batidas que se usan hoy (mínimo 2) más las agregadas con
  // «Agregar batida», hasta 10.
  const numBatidas = Math.min(
    Math.max(batidasUsadas(efectivas.dec, efectivas.prod), MIN_BATIDAS_VISIBLES, batidasAgregadas),
    MAX_BATIDAS
  );
  const BATIDAS = indices(numBatidas);
  const agregarBatida = () => setBatidasAgregadas(Math.min(numBatidas + 1, MAX_BATIDAS));

  const usuario = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  /** Actualiza la fila de hoy; si no existe todavía, la crea con ese dato. */
  const guardarFila = async (
    sucursalId: number,
    productoId: number,
    cambios: {
      sugerido_override?: number | null;
      mandar_override?: number | null;
      cambio?: number;
      decorado?: number;
      sin_decorar?: number;
      restante?: number | null;
    }
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
    // Quitar un ajuste que no existe: no hay nada que crear.
    if (cambios.sugerido_override === null || cambios.mandar_override === null) return;
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
      if (e.tipo === "cambio") {
        const [productoId, sucursalId] = e.clave.split("-").map(Number);
        await guardarFila(sucursalId, productoId, { cambio: e.numero ?? 0 });
      } else if (e.tipo === "mandar" || e.tipo === "enviar") {
        const [productoId, sucursalId] = e.clave.split("-").map(Number);
        await guardarFila(
          sucursalId,
          productoId,
          e.tipo === "enviar" ? { mandar_override: e.numero } : { sugerido_override: e.numero }
        );
      } else {
        if (principal.id === null) throw new Error("Sin Principal");
        await guardarFila(
          principal.id,
          e.productoId,
          // RESTANTE vacío = null (no se anotó); DECO / SIN DECO vacío = 0.
          e.tipo === "restante" ? { restante: e.numero } : { [e.tipo]: e.numero ?? 0 }
        );
      }
    },
    onSuccess: (_d, e) => {
      setErrorGuardado(false);
      if (e.tipo === "cambio") {
        setCambios((prev) => {
          const { [e.clave]: _quitado, ...resto } = prev;
          void _quitado;
          return e.numero ? { ...resto, [e.clave]: e.numero } : resto;
        });
      } else if (e.tipo === "enviar") {
        setMandarOverride((prev) => {
          const { [e.clave]: _quitado, ...resto } = prev;
          void _quitado;
          return e.numero === null ? resto : { ...resto, [e.clave]: e.numero };
        });
      } else if (e.tipo === "mandar") {
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
      } else if (e.tipo === "restante") {
        setRestante((prev) => {
          const { [e.productoId]: _quitado, ...resto } = prev;
          void _quitado;
          return e.numero === null ? resto : { ...resto, [e.productoId]: e.numero };
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

  /** Lo del panel de batidas: a mano = upsert; vacío = se borra el ajuste. */
  const guardarBatidas = useMutation({
    mutationFn: async ({ productoId, cambios: lista }: { productoId: number; cambios: CambioBatida[] }) => {
      const updated_by = await usuario();
      const updated_at = new Date().toISOString();
      const escritos = lista.filter((c) => c.cantidad !== null);
      if (escritos.length > 0) {
        const { error } = await supabase.from("batidas_ajuste").upsert(
          escritos.map((c) => ({
            fecha,
            producto_id: productoId,
            tipo: c.tipo,
            tanda: c.tanda,
            cantidad: c.cantidad!,
            updated_at,
            updated_by,
          })),
          { onConflict: "fecha,producto_id,tipo,tanda" }
        );
        if (error) throw new Error(error.message);
      }
      for (const tipo of ["decoracion", "produccion"] as const) {
        const borrar = lista.filter((c) => c.cantidad === null && c.tipo === tipo).map((c) => c.tanda);
        if (borrar.length === 0) continue;
        const { error } = await supabase
          .from("batidas_ajuste")
          .delete()
          .eq("fecha", fecha)
          .eq("producto_id", productoId)
          .eq("tipo", tipo)
          .in("tanda", borrar);
        if (error) throw new Error(error.message);
      }
    },
    retry: 2,
    onSuccess: (_d, { productoId, cambios: lista }) => {
      setErrorGuardado(false);
      setAjustesBatida((prev) => {
        const tocadas = new Set(lista.map((c) => `${c.tipo}-${c.tanda}`));
        const resto = prev.filter(
          (a) => a.producto_id !== productoId || !tocadas.has(`${a.tipo}-${a.tanda}`)
        );
        return [
          ...resto,
          ...lista
            .filter((c) => c.cantidad !== null)
            .map((c) => ({ producto_id: productoId, tipo: c.tipo, tanda: c.tanda, cantidad: c.cantidad! })),
        ];
      });
      setPanel(null);
    },
    onError: () => setErrorGuardado(true),
  });

  const confirmar = () => {
    if (!edicion) return;
    const texto = edicion.valor.trim();
    const numero = texto === "" ? null : parseInt(texto, 10);
    setEdicion(null);
    if (numero !== null && (!Number.isFinite(numero) || numero < 0)) return;
    if (edicion.tipo === "cambio") {
      if ((numero ?? 0) === (cambios[edicion.clave] ?? 0)) return;
    } else if (edicion.tipo === "enviar") {
      // Sin cambios: mismo ajuste, o se limpió sin haber ajuste.
      const ajuste = mandarOverride[edicion.clave];
      if (numero === null && ajuste === undefined) return;
      if (numero !== null && numero === ajuste) return;
    } else if (edicion.tipo === "mandar") {
      const celda = celdas[edicion.clave];
      if (!celda) return;
      // Sin cambios: mismo override, o se limpió sin haber override.
      if (numero === null && !celda.esOverride) return;
      if (numero !== null && celda.esOverride && numero === celda.sugerido) return;
    } else if (edicion.tipo === "restante") {
      if (numero === (restante[edicion.productoId] ?? null)) return;
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
  const columnas = 4 + tiendas.length * 2 + 4 + (sucursalPrincipal ? 1 : 0) + 1 + numBatidas;
  const productoPanel = panel === null ? null : (productos.find((p) => p.id === panel) ?? null);
  /** Hay algo de DEC / PROD cambiado a mano en este producto. */
  const conAjuste = (productoId: number, tipo: AjusteBatida["tipo"]) =>
    ajustesBatida.some((a) => a.producto_id === productoId && a.tipo === tipo);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div role="tablist" aria-label="Qué columnas ver" className="inline-flex rounded-lg border bg-muted/40 p-1">
          {VISTAS.map((v) => (
            <button
              key={v.valor}
              type="button"
              role="tab"
              aria-selected={vista === v.valor}
              onClick={() => cambiarVista(v.valor)}
              className={cn(
                "min-h-10 rounded-md px-4 text-sm font-semibold",
                vista === v.valor ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
        {vista !== "despacho" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Batidas hoy: <span className="font-semibold text-foreground">{numBatidas}</span>
            </span>
            {numBatidas < MAX_BATIDAS && (
              <Button type="button" variant="outline" size="sm" onClick={agregarBatida}>
                + Batida
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-muted/40 p-4 text-sm print:hidden">
        {vista !== "produccion" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <p>
              <span className="font-semibold">1. Lo que hay en Principal.</span>{" "}
              <span className="text-muted-foreground">
                Escribí DECO y SIN DECO (se guardan en el inventario de Principal
                de hoy). INV/TOTAL = DECO + SIN DECO.
              </span>
            </p>
            <p>
              <span className="font-semibold">2. Lo que va a cada tienda.</span>{" "}
              <span className="text-muted-foreground">
                Es el pedido que anotó la tienda; abajo, en chico, su sugerido.
                Tocá un número para cambiarlo y presioná Enter; vacío = vuelve al
                pedido. CM = cambio de la tienda (también se puede cambiar).
              </span>
            </p>
            <p>
              <span className="font-semibold">3. Revisá el SALDO.</span>{" "}
              <span className="text-muted-foreground">
                INV/TOTAL + CM − lo que se manda. En{" "}
                <span className="font-semibold text-destructive">rojo</span>,
                falta producto: hay que hornear o mandar menos.
              </span>
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">DEC y PROD por batida</span>{" "}
            (21*6 = 21 en la primera y 6 en la segunda). Dec 1 = lo que está sin
            decorar; Dec 2 = lo que se hornea; Prod sale del reparto. Tocá un
            producto para cambiar sus batidas (hasta {MAX_BATIDAS}). Las libras
            salen de Prod; en rojo, la batida que pasa de {MAX_LIBRAS_BATIDA} lb.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">• 12</span> = cambiado a
          mano · <span className="italic">12</span> en cursiva = la tienda aún no
          anota ese producto · — = la tienda no lleva ese producto · Al imprimir
          sale la hoja completa, con todas las columnas.
        </p>
      </div>

      {errorGuardado && (
        <Aviso tipo="error" className="print:hidden">
          No se pudo guardar el cambio. Revisá que haya internet e intentá de
          nuevo.
        </Aviso>
      )}

      {/* La tabla se desplaza dentro de su marco (alto de la pantalla) para que
          los títulos queden fijos arriba al bajar y la columna Producto a la
          izquierda al moverse de lado. Al imprimir, todo normal. */}
      <div className="max-h-[80vh] overflow-auto rounded-lg border print:max-h-none print:overflow-visible print:rounded-none print:border-0">
        <table
          className={cn(
            "w-full border-collapse text-sm print:min-w-0 print:text-[9.5px]",
            vista !== "produccion" && "min-w-[900px]"
          )}
        >
          <thead className="sticky top-0 z-[2] bg-muted shadow-[0_1px_0_var(--border)] print:static print:bg-transparent print:shadow-none">
            <tr className="border-b bg-muted text-xs uppercase print:border-black print:bg-transparent">
              <th className="sticky left-0 z-[3] shadow-[1px_0_0_var(--border)] bg-muted px-3 py-2 text-left font-semibold print:static print:bg-transparent">
                Producto
              </th>
              <th className={cn("border-l px-2 py-2 text-right font-semibold", col("despacho"))}>Deco</th>
              <th className={cn("px-2 py-2 text-right font-semibold", col("despacho", "produccion"))}>Sin deco</th>
              <th className={cn("px-2 py-2 text-right font-semibold", col("despacho"))}>Inv/Total</th>
              {tiendas.map((t) => (
                <Fragment key={t.id}>
                  <th className={cn("border-l px-2 py-2 text-right font-semibold", col("despacho"))}>{t.nombre}</th>
                  <th className={cn("px-2 py-2 text-right font-medium text-muted-foreground", col("despacho"))}>CM</th>
                </Fragment>
              ))}
              <th className={cn("border-l px-2 py-2 text-right font-semibold", col("despacho"))}>Saldo</th>
              <th
                className={cn("border-l px-2 py-2 text-left font-semibold", col("produccion"))}
                title="Cuánto se decora en cada batida: 1 = lo sin decorar, 2 = lo que se hornea"
              >
                Dec
                <span className="block font-normal normal-case">por batida</span>
              </th>
              <th
                className={cn("border-l px-2 py-2 text-left font-semibold", col("produccion"))}
                title="Cuánto se hornea en cada batida (del reparto)"
              >
                Prod
                <span className="block font-normal normal-case">por batida</span>
              </th>
              <th
                className={cn("border-l px-2 py-2 text-right font-semibold", col("produccion"))}
                title="Sobrantes. Se anota a mano (la fórmula está pendiente)"
              >
                Restante
              </th>
              {sucursalPrincipal && (
                <th
                  className={cn("border-l px-2 py-2 text-right font-semibold", col("despacho"))}
                  title="Lo que necesita la vitrina de Principal"
                >
                  {sucursalPrincipal.nombre}
                </th>
              )}
              <th
                className={cn("border-l px-2 py-2 text-right font-semibold", col("produccion"))}
                title="Suma de todas las sucursales"
              >
                Sugerido
              </th>
              {BATIDAS.map((i) => (
                <th
                  key={i}
                  className={cn("px-2 py-2 text-right font-semibold", i === 0 && "border-l", col("produccion"))}
                  title={`Libras de masa en la batida ${i + 1} (máximo ${MAX_LIBRAS_BATIDA} lb)`}
                >
                  {i + 1}
                  <span className="block font-normal normal-case">lb</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map(([categoria, lista]) => {
              const filas = lista.map((p) => ({
                p,
                fila: filaHojaCompleta(
                  {
                    celdas,
                    sinDecorar,
                    decorado,
                    cambios,
                    pedidos,
                    mandarOverride,
                    saldoPrincipal: principal.saldo,
                    principalId: principal.id,
                  },
                  p,
                  tiendas
                ),
                total: sucursales.reduce((t, x) => t + (celdas[`${p.id}-${x.id}`]?.sugerido ?? 0), 0),
              }));
              // Total de la sección de masa, sin porciones (como en el Excel).
              const paraTotal = SECCIONES_CON_TOTAL.includes(categoria.toUpperCase())
                ? filas.filter((f) => cuentaEnTotalSeccion(f.p))
                : [];
              return (
                <Fragment key={categoria}>
                  <tr className="border-b bg-muted/30 print:border-black/60 print:bg-black/10">
                    <td colSpan={columnas} className="px-3 py-1.5 text-xs font-bold uppercase">
                      {/* El nombre de la sección queda a la vista al mover la tabla de lado. */}
                      <span className="sticky left-3 print:static">{categoria}</span>
                    </td>
                  </tr>
                  {filas.map(({ p, fila, total }) => {
                    const nombre = `${p.nombre}${p.tamano ? ` ${p.tamano}` : ""}`;
                    const editablePrincipal = principal.id !== null;
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
                              // Sin nada anotado, los que no llevan decoración muestran su saldo.
                              valor={fila.deco ?? 0}
                              etiqueta={`Deco de ${nombre}`}
                              className={cn("border-l", col("despacho"))}
                              {...edicionProps}
                            />
                            <CeldaPrincipal
                              campo="sin_decorar"
                              producto={p.id}
                              valor={sinDecorar[p.id] ?? 0}
                              etiqueta={`Sin deco de ${nombre}`}
                              className={col("despacho", "produccion")}
                              {...edicionProps}
                            />
                          </>
                        ) : (
                          <>
                            <Numero
                              valor={fila.deco}
                              className={cn("border-l", col("despacho"))}
                              titulo="Saldo de Principal (sale de su inventario)"
                            />
                            <Numero valor={null} className={col("despacho", "produccion")} />
                          </>
                        )}
                        <Numero valor={fila.invTotal} className={cn("font-semibold", col("despacho"))} />
                        {tiendas.map((t, i) => (
                          <Fragment key={t.id}>
                            <CeldaEnviar
                              clave={`${p.id}-${t.id}`}
                              tienda={fila.tiendas[i]}
                              etiqueta={`Lo que se manda de ${nombre} a ${t.nombre}`}
                              className={cn("border-l", col("despacho"))}
                              {...edicionProps}
                            />
                            <CeldaEditable
                              editando={edicion?.tipo === "cambio" && edicion.clave === `${p.id}-${t.id}`}
                              valorEdicion={edicion?.valor ?? ""}
                              alEscribir={(v) => setEdicion({ tipo: "cambio", clave: `${p.id}-${t.id}`, valor: v })}
                              alTocar={() =>
                                setEdicion({
                                  tipo: "cambio",
                                  clave: `${p.id}-${t.id}`,
                                  valor: fila.tiendas[i].cm ? String(fila.tiendas[i].cm) : "",
                                })
                              }
                              valor={fila.tiendas[i].cm ?? 0}
                              etiqueta={`CM de ${nombre} en ${t.nombre}`}
                              className={cn("text-muted-foreground", col("despacho"))}
                              confirmar={confirmar}
                              cancelar={() => setEdicion(null)}
                            />
                          </Fragment>
                        ))}
                        <td
                          className={cn(
                            "border-l px-2 py-1.5 text-right font-bold tabular-nums",
                            fila.saldo < 0
                              ? "bg-destructive/10 text-destructive print:bg-transparent print:text-black"
                              : "text-exito print:text-black",
                            col("despacho")
                          )}
                          title={fila.saldo < 0 ? `Faltan ${-fila.saldo}` : "Alcanza con lo que hay en Principal"}
                        >
                          {fila.saldo}
                        </td>
                        {(["decoracion", "produccion"] as const).map((clase) => (
                          <CeldaBatidas
                            key={clase}
                            valor={formatoTandas(
                              (clase === "decoracion" ? efectivas.dec : efectivas.prod).get(p.id) ?? []
                            )}
                            ajustada={conAjuste(p.id, clase)}
                            etiqueta={`${clase === "decoracion" ? "Dec" : "Prod"} por batida de ${nombre}`}
                            alTocar={() => setPanel(p.id)}
                            className={cn("border-l", col("produccion"))}
                          />
                        ))}
                        {editablePrincipal ? (
                          <CeldaPrincipal
                            campo="restante"
                            producto={p.id}
                            valor={restante[p.id] ?? 0}
                            etiqueta={`Restante de ${nombre}`}
                            className={cn("border-l", col("produccion"))}
                            {...edicionProps}
                          />
                        ) : (
                          <Numero valor={null} className={cn("border-l", col("produccion"))} />
                        )}
                        {sucursalPrincipal && (
                          <CeldaMandar
                            clave={`${p.id}-${sucursalPrincipal.id}`}
                            celda={celdas[`${p.id}-${sucursalPrincipal.id}`]}
                            etiqueta={`Sugerido de ${nombre} en ${sucursalPrincipal.nombre}`}
                            className={cn("border-l", col("despacho"))}
                            {...edicionProps}
                          />
                        )}
                        <td className={cn("border-l px-2 py-1.5 text-right font-semibold tabular-nums", col("produccion"))}>
                          {total || ""}
                        </td>
                        <CeldasLibras libras={librasDe(p.id)} numBatidas={numBatidas} className={col("produccion")} />
                      </tr>
                    );
                  })}
                  {paraTotal.length > 0 && (
                    <FilaTotalSeccion
                      categoria={categoria}
                      fila={sumarFilas(paraTotal.map((f) => f.fila))}
                      principal={
                        sucursalPrincipal
                          ? paraTotal.reduce(
                              (t, f) => t + (celdas[`${f.p.id}-${sucursalPrincipal.id}`]?.sugerido ?? 0),
                              0
                            )
                          : null
                      }
                      total={paraTotal.reduce((t, f) => t + f.total, 0)}
                      dec={sumarTandas(paraTotal.map((f) => efectivas.dec.get(f.p.id)))}
                      prod={sumarTandas(paraTotal.map((f) => efectivas.prod.get(f.p.id)))}
                      restante={paraTotal.reduce((t, f) => t + (restante[f.p.id] ?? 0), 0)}
                      libras={sumarTandas(paraTotal.map((f) => librasDe(f.p.id)))}
                      numBatidas={numBatidas}
                      col={col}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {productoPanel && (
        <PanelBatidas
          key={productoPanel.id}
          producto={{
            id: productoPanel.id,
            nombre: `${productoPanel.nombre}${productoPanel.tamano ? ` · ${productoPanel.tamano}` : ""}`,
            lleva_decoracion: productoPanel.lleva_decoracion,
          }}
          numBatidas={numBatidas}
          agregarBatida={agregarBatida}
          prodReparto={batidas.prodReparto[productoPanel.id] ?? []}
          sinDecorar={sinDecorar[productoPanel.id] ?? 0}
          ajustes={ajustesBatida}
          librasPorUnidad={batidas.libras[productoPanel.id] ?? null}
          guardando={guardarBatidas.isPending}
          alGuardar={(lista) => guardarBatidas.mutate({ productoId: productoPanel.id, cambios: lista })}
          alCerrar={() => setPanel(null)}
        />
      )}
    </div>
  );
}

/** Total de la sección (sin porciones), al final de VAINILLA, CHOCOLATE y MIXTO. */
function FilaTotalSeccion({
  categoria,
  fila,
  principal,
  total,
  dec,
  prod,
  restante,
  libras,
  numBatidas,
  col,
}: {
  categoria: string;
  fila: FilaHojaCompleta;
  principal: number | null;
  total: number;
  dec: number[];
  prod: number[];
  restante: number;
  libras: number[];
  numBatidas: number;
  col: (...grupos: Exclude<Vista, "todo">[]) => string;
}) {
  return (
    <tr className="border-b-2 border-foreground/30 bg-muted/50 font-bold print:border-black print:bg-black/10">
      <td
        className="sticky left-0 z-[1] shadow-[1px_0_0_var(--border)] bg-muted px-3 py-1.5 print:static print:bg-transparent"
        title="Suma de la sección sin contar porciones"
      >
        Total {categoria}
        <span className="block text-xs font-normal text-muted-foreground">sin porciones</span>
      </td>
      <Numero valor={fila.deco} className={cn("border-l font-bold", col("despacho"))} />
      <Numero valor={fila.sinDeco} className={cn("font-bold", col("despacho", "produccion"))} />
      <Numero valor={fila.invTotal} className={cn("font-bold", col("despacho"))} />
      {fila.tiendas.map((t) => (
        <Fragment key={t.sucursalId}>
          <Numero valor={t.mandar} className={cn("border-l font-bold", col("despacho"))} />
          <Numero valor={t.cm} apagado className={col("despacho")} />
        </Fragment>
      ))}
      <td
        className={cn(
          "border-l px-2 py-1.5 text-right tabular-nums",
          fila.saldo < 0
            ? "bg-destructive/10 text-destructive print:bg-transparent print:text-black"
            : "text-exito print:text-black",
          col("despacho")
        )}
      >
        {fila.saldo}
      </td>
      <Texto valor={formatoTandas(dec)} className={cn("border-l", col("produccion"))} />
      <Texto valor={formatoTandas(prod)} className={cn("border-l", col("produccion"))} />
      <Numero valor={restante || null} className={cn("border-l font-bold", col("produccion"))} />
      {principal !== null && <Numero valor={principal} className={cn("border-l font-bold", col("despacho"))} />}
      <td className={cn("border-l px-2 py-1.5 text-right tabular-nums", col("produccion"))}>{total || ""}</td>
      <CeldasLibras libras={libras} total numBatidas={numBatidas} className={col("produccion")} />
    </tr>
  );
}

/** DEC / PROD por batida ("21*6"), como en el Excel. */
function Texto({ valor, className }: { valor: string; className?: string }) {
  return (
    <td className={cn("whitespace-nowrap px-2 py-1.5 text-left tabular-nums", className)}>
      {valor}
    </td>
  );
}

/** DEC o PROD de un producto ("21*6"): se toca para abrir el panel de batidas. */
function CeldaBatidas({
  valor,
  ajustada,
  etiqueta,
  alTocar,
  className,
}: {
  valor: string;
  ajustada: boolean;
  etiqueta: string;
  alTocar: () => void;
  className?: string;
}) {
  return (
    <td className={cn("px-1 py-0.5 text-left", className)}>
      <button
        type="button"
        onClick={alTocar}
        title={ajustada ? "Cambiado a mano · tocá para ver las batidas" : "Tocá para ver o cambiar las batidas"}
        className={cn(BOTON_CELDA, "min-h-8 whitespace-nowrap text-left", ajustada && "font-semibold text-primary")}
        aria-label={`${etiqueta}: ${valor || "nada"}${ajustada ? " (cambiado a mano)" : ""}`}
      >
        {ajustada ? "• " : ""}
        {valor || " "}
      </button>
    </td>
  );
}

/**
 * Libras por batida (las que se ven hoy). En el total de la sección, la
 * batida que pasa de 100 lb sale en rojo; los productos sin libras quedan
 * vacíos.
 */
function CeldasLibras({
  libras,
  total,
  numBatidas,
  className,
}: {
  libras: number[] | null;
  total?: boolean;
  numBatidas: number;
  className?: string;
}) {
  return (
    <>
      {indices(numBatidas).map((i) => {
        const lb = libras?.[i] ?? 0;
        const excede = total && lb > MAX_LIBRAS_BATIDA;
        return (
          <td
            key={i}
            className={cn(
              "px-2 py-1.5 text-right tabular-nums",
              i === 0 && "border-l",
              !total && "text-muted-foreground",
              excede && "bg-destructive/10 text-destructive print:bg-transparent print:text-black",
              className
            )}
            title={excede ? `Se pasa de ${MAX_LIBRAS_BATIDA} lb en la batida ${i + 1}` : undefined}
          >
            {libras === null ? "" : total ? lb : lb || ""}
            {excede ? " ⚠" : ""}
          </td>
        );
      })}
    </>
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
  campo: "decorado" | "sin_decorar" | "restante";
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

/** Casilla de número que se toca para escribirla (DEC / PROD por batida, CM). */
function CeldaEditable({
  editando,
  valorEdicion,
  alEscribir,
  alTocar,
  valor,
  destacado,
  titulo,
  etiqueta,
  className,
  confirmar,
  cancelar,
}: {
  editando: boolean;
  valorEdicion: string;
  alEscribir: (v: string) => void;
  alTocar: () => void;
  valor: number;
  destacado?: boolean;
  titulo?: string;
  etiqueta: string;
  className?: string;
  confirmar: () => void;
  cancelar: () => void;
}) {
  return (
    <td className={cn("px-1 py-0.5 text-right", className)}>
      {editando ? (
        <CampoNumero
          valor={valorEdicion}
          onChange={alEscribir}
          etiqueta={etiqueta}
          confirmar={confirmar}
          cancelar={cancelar}
        />
      ) : (
        <button
          type="button"
          onClick={alTocar}
          title={titulo}
          className={cn(BOTON_CELDA, "min-h-8", destacado && "font-semibold text-primary")}
          aria-label={`${etiqueta}: ${valor}${destacado ? " (cambiado a mano)" : ""}`}
        >
          {destacado ? "• " : ""}
          {valor ? valor : destacado ? "0" : ""}
        </button>
      )}
    </td>
  );
}

/**
 * Lo que se le manda a una tienda: su pedido (grande) y su sugerido de
 * referencia (chico). Se toca para ajustarlo; vacío = vuelve al pedido.
 */
function CeldaEnviar({
  clave,
  tienda,
  etiqueta,
  className,
  edicion,
  setEdicion,
  confirmar,
}: EdicionProps & {
  clave: string;
  tienda: FilaHojaCompleta["tiendas"][number];
  etiqueta: string;
  className?: string;
}) {
  const { mandar, sugerido, ajustado } = tienda;
  if (mandar === null && sugerido === null) {
    return (
      <td
        className={cn("px-2 py-1.5 text-right text-muted-foreground", className)}
        title="La tienda no lleva este producto y no lo pidió"
      >
        —
      </td>
    );
  }
  const referencia =
    sugerido === null ? null : (
      <span className="block text-[11px] leading-tight text-muted-foreground print:hidden">
        sug. {sugerido}
      </span>
    );
  if (edicion?.tipo === "enviar" && edicion.clave === clave) {
    return (
      <td className={cn("px-1 py-0.5 text-right", className)}>
        <CampoNumero
          valor={edicion.valor}
          onChange={(v) => setEdicion({ tipo: "enviar", clave, valor: v })}
          etiqueta={etiqueta}
          confirmar={confirmar}
          cancelar={() => setEdicion(null)}
        />
        {referencia}
      </td>
    );
  }
  return (
    <td className={cn("px-1 py-0.5 text-right", className)}>
      <button
        type="button"
        onClick={() =>
          setEdicion({ tipo: "enviar", clave, valor: ajustado && mandar !== null ? String(mandar) : "" })
        }
        title={ajustado ? "Cambiado por administración" : mandar === null ? "La tienda no pidió" : "Pedido de la tienda"}
        className={cn(BOTON_CELDA, ajustado && "font-semibold text-primary")}
        aria-label={`${etiqueta}: ${mandar ?? "sin pedido"}${ajustado ? " (ajustado)" : ""}${
          sugerido !== null ? `, sugerido ${sugerido}` : ""
        }`}
      >
        {ajustado ? "• " : ""}
        {/* Sin pedido: casilla vacía (el espacio la mantiene del mismo alto). */}
        {mandar ?? "\u00a0"}
      </button>
      {referencia}
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

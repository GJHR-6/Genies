"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
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
  MAX_LIBRAS_BATIDA,
  NUM_TANDAS,
  batidasDelCuadro,
  claveBatida,
  type AjusteBatida,
} from "@/lib/batidas";
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

/**
 * Para DEC / PROD por batida (tanda T1–T4): lo que se hornea según el
 * reparto, las casillas cambiadas a mano y las libras de masa por unidad.
 */
export type DatosBatidas = {
  prodReparto: Record<number, number[]>;
  ajustes: AjusteBatida[];
  libras: Record<number, number>;
};

const TANDAS = Array.from({ length: NUM_TANDAS }, (_, i) => i);

/** Libras de cada batida de un producto: lo que se hornea × libras por unidad. */
function librasProducto(
  libras: Record<number, number>,
  prodPorProducto: ReadonlyMap<number, number[]>,
  productoId: number
): number[] | null {
  const lb = libras[productoId];
  if (!lb) return null;
  const prod = prodPorProducto.get(productoId) ?? [];
  return TANDAS.map((i) => Math.round((prod[i] ?? 0) * lb * 100) / 100);
}

/** Suma tanda por tanda. */
function sumarTandas(listas: (readonly number[] | null | undefined)[]): number[] {
  return TANDAS.map((i) =>
    Math.round(listas.reduce((t, l) => t + (l?.[i] ?? 0), 0) * 100) / 100
  );
}

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
 * sobre su pedido), el CM de una tienda, el sugerido de Principal,
 * DECO / SIN DECO, o una batida de DEC / PROD.
 */
type Edicion =
  | { tipo: "enviar"; clave: string; valor: string }
  | { tipo: "cambio"; clave: string; valor: string }
  | { tipo: "mandar"; clave: string; valor: string }
  | { tipo: "decorado" | "sin_decorar"; productoId: number; valor: string }
  | {
      tipo: "batida";
      productoId: number;
      clase: AjusteBatida["tipo"];
      tanda: number;
      valor: string;
    }
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
  const [mandarOverride, setMandarOverride] = useState(ajustesProp);
  const [cambios, setCambios] = useState(principal.cambios);
  const [ajustesBatida, setAjustesBatida] = useState(batidas.ajustes);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [errorGuardado, setErrorGuardado] = useState(false);

  // Al recargar (router.refresh) llegan los datos frescos del servidor.
  useEffect(() => setCeldas(celdasProp), [celdasProp]);
  useEffect(() => setDecorado(principal.decorado), [principal.decorado]);
  useEffect(() => setSinDecorar(principal.sinDecorar), [principal.sinDecorar]);
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
      if (e.tipo === "batida") {
        // Vacío = vuelve a lo automático.
        if (e.numero === null) {
          const { error } = await supabase
            .from("batidas_ajuste")
            .delete()
            .eq("fecha", fecha)
            .eq("producto_id", e.productoId)
            .eq("tipo", e.clase)
            .eq("tanda", e.tanda);
          if (error) throw new Error(error.message);
          return;
        }
        const { error } = await supabase.from("batidas_ajuste").upsert(
          {
            fecha,
            producto_id: e.productoId,
            tipo: e.clase,
            tanda: e.tanda,
            cantidad: e.numero,
            updated_at: new Date().toISOString(),
            updated_by: await usuario(),
          },
          { onConflict: "fecha,producto_id,tipo,tanda" }
        );
        if (error) throw new Error(error.message);
      } else if (e.tipo === "cambio") {
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
        await guardarFila(principal.id, e.productoId, { [e.tipo]: e.numero ?? 0 });
      }
    },
    onSuccess: (_d, e) => {
      setErrorGuardado(false);
      if (e.tipo === "batida") {
        setAjustesBatida((prev) => {
          const resto = prev.filter(
            (a) => !(a.producto_id === e.productoId && a.tipo === e.clase && a.tanda === e.tanda)
          );
          return e.numero === null
            ? resto
            : [...resto, { producto_id: e.productoId, tipo: e.clase, tanda: e.tanda, cantidad: e.numero }];
        });
        // Solo cambia este cuadro: no hace falta recargar.
        return;
      }
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
    if (edicion.tipo === "batida") {
      const clave = claveBatida(edicion.productoId, edicion.clase, edicion.tanda);
      const ajustada = efectivas.ajustadas.has(clave);
      const fila = (edicion.clase === "decoracion" ? efectivas.dec : efectivas.prod).get(edicion.productoId);
      const actual = fila?.[edicion.tanda - 1] ?? 0;
      // Sin cambios: se limpió sin haber ajuste, o el mismo número.
      if (numero === null && !ajustada) return;
      if (numero !== null && numero === actual) return;
    } else if (edicion.tipo === "cambio") {
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
  const columnas = 4 + tiendas.length * 2 + 1 + 2 * NUM_TANDAS + (sucursalPrincipal ? 1 : 0) + 1 + NUM_TANDAS;

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
            Es el pedido que anotó la tienda; abajo, en chico, su sugerido.
            Tocá un número para cambiarlo y presioná Enter; vacío = vuelve al
            pedido. Sin pedido no se manda nada. CM = cambio de la tienda.
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
          anota ese producto (columna de Principal) · — = la tienda no lleva ese producto · DEC 1 =
          lo que está sin decorar; DEC 2 = lo que se hornea (suma de PROD) · PROD
          sale del reparto · Todas las casillas de DEC, PROD y CM se pueden tocar
          para cambiarlas; vacío = vuelve a lo automático · Las libras de las
          batidas 1–4 salen de PROD
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
              {(["decoracion", "produccion"] as const).map((clase) =>
                TANDAS.map((i) => (
                  <th
                    key={`${clase}-${i}`}
                    className={cn("px-2 py-2 text-right font-semibold", i === 0 && "border-l")}
                    title={
                      clase === "produccion"
                        ? `Cuánto se hornea en la batida ${i + 1} (del reparto)`
                        : i === 0
                          ? "Decorar primero lo que está sin decorar"
                          : i === 1
                            ? "Decorar lo que se hornea (suma de PROD)"
                            : `Cuánto se decora en la batida ${i + 1}`
                    }
                  >
                    {clase === "decoracion" ? "Dec" : "Prod"}
                    <span className="block font-normal normal-case">{i + 1}</span>
                  </th>
                ))
              )}
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
              {TANDAS.map((i) => (
                <th
                  key={i}
                  className={cn("px-2 py-2 text-right font-semibold", i === 0 && "border-l")}
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
                              titulo="Saldo de Principal (sale de su inventario)"
                            />
                            <Numero valor={null} />
                          </>
                        )}
                        <Numero valor={fila.invTotal} className="font-semibold" />
                        {tiendas.map((t, i) => (
                          <Fragment key={t.id}>
                            <CeldaEnviar
                              clave={`${p.id}-${t.id}`}
                              tienda={fila.tiendas[i]}
                              etiqueta={`Lo que se manda de ${nombre} a ${t.nombre}`}
                              className="border-l"
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
                              className="text-muted-foreground"
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
                              : "text-exito print:text-black"
                          )}
                          title={fila.saldo < 0 ? `Faltan ${-fila.saldo}` : "Alcanza con lo que hay en Principal"}
                        >
                          {fila.saldo}
                        </td>
                        {(["decoracion", "produccion"] as const).map((clase) =>
                          TANDAS.map((i) => {
                            const tanda = i + 1;
                            const valor =
                              (clase === "decoracion" ? efectivas.dec : efectivas.prod).get(p.id)?.[i] ?? 0;
                            const ajustada = efectivas.ajustadas.has(claveBatida(p.id, clase, tanda));
                            return (
                              <CeldaEditable
                                key={`${clase}-${i}`}
                                editando={
                                  edicion?.tipo === "batida" &&
                                  edicion.productoId === p.id &&
                                  edicion.clase === clase &&
                                  edicion.tanda === tanda
                                }
                                valorEdicion={edicion?.valor ?? ""}
                                alEscribir={(v) =>
                                  setEdicion({ tipo: "batida", productoId: p.id, clase, tanda, valor: v })
                                }
                                alTocar={() =>
                                  setEdicion({
                                    tipo: "batida",
                                    productoId: p.id,
                                    clase,
                                    tanda,
                                    valor: valor ? String(valor) : "",
                                  })
                                }
                                valor={valor}
                                destacado={ajustada}
                                titulo={ajustada ? "Cambiado a mano" : undefined}
                                etiqueta={`${clase === "decoracion" ? "Dec" : "Prod"} batida ${tanda} de ${nombre}`}
                                className={i === 0 ? "border-l" : undefined}
                                confirmar={confirmar}
                                cancelar={() => setEdicion(null)}
                              />
                            );
                          })
                        )}
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
                        <CeldasLibras libras={librasDe(p.id)} />
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
                      libras={sumarTandas(paraTotal.map((f) => librasDe(f.p.id)))}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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
  libras,
}: {
  categoria: string;
  fila: FilaHojaCompleta;
  principal: number | null;
  total: number;
  dec: number[];
  prod: number[];
  libras: number[];
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
      <Numero valor={fila.deco} className="border-l font-bold" />
      <Numero valor={fila.sinDeco} className="font-bold" />
      <Numero valor={fila.invTotal} className="font-bold" />
      {fila.tiendas.map((t) => (
        <Fragment key={t.sucursalId}>
          <Numero valor={t.mandar} className="border-l font-bold" />
          <Numero valor={t.cm} apagado />
        </Fragment>
      ))}
      <td
        className={cn(
          "border-l px-2 py-1.5 text-right tabular-nums",
          fila.saldo < 0
            ? "bg-destructive/10 text-destructive print:bg-transparent print:text-black"
            : "text-exito print:text-black"
        )}
      >
        {fila.saldo}
      </td>
      {[dec, prod].map((fila, j) =>
        TANDAS.map((i) => (
          <Numero key={`${j}-${i}`} valor={fila[i]} className={cn("font-bold", i === 0 && "border-l")} />
        ))
      )}
      {principal !== null && <Numero valor={principal} className="border-l font-bold" />}
      <td className="border-l px-2 py-1.5 text-right tabular-nums">{total || ""}</td>
      <CeldasLibras libras={libras} total />
    </tr>
  );
}


/**
 * Libras por batida (1–4). En el total de la sección, la batida que pasa de
 * 100 lb sale en rojo; los productos sin libras quedan vacíos.
 */
function CeldasLibras({ libras, total }: { libras: number[] | null; total?: boolean }) {
  return (
    <>
      {TANDAS.map((i) => {
        const lb = libras?.[i] ?? 0;
        const excede = total && lb > MAX_LIBRAS_BATIDA;
        return (
          <td
            key={i}
            className={cn(
              "px-2 py-1.5 text-right tabular-nums",
              i === 0 && "border-l",
              !total && "text-muted-foreground",
              excede && "bg-destructive/10 text-destructive print:bg-transparent print:text-black"
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

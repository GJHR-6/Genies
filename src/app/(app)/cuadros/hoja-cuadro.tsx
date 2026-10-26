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
import { MAX_LIBRAS_BATIDA, NUM_TANDAS, formatoTandas } from "@/lib/batidas";
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
 * Lo del reparto de hoy: cuánto se decora y se hornea en cada batida
 * (tanda T1–T4) por producto, y las libras de masa por unidad.
 */
export type DatosBatidas = {
  dec: Record<number, number[]>;
  prod: Record<number, number[]>;
  libras: Record<number, number>;
};

const TANDAS = Array.from({ length: NUM_TANDAS }, (_, i) => i);

/** Libras de cada batida de un producto: lo que se hornea × libras por unidad. */
function librasProducto(batidas: DatosBatidas, productoId: number): number[] | null {
  const lb = batidas.libras[productoId];
  if (!lb) return null;
  const prod = batidas.prod[productoId] ?? [];
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
export function HojaCuadro({ fecha, productos, sucursales, celdas: celdasProp, principal, batidas }: Props) {
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
  const columnas = 4 + tiendas.length * 2 + 3 + (sucursalPrincipal ? 1 : 0) + 1 + NUM_TANDAS;

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
          anota ese producto · — = la tienda no lleva ese producto · DEC y PROD
          (21*6 = 21 en la primera batida y 6 en la segunda) y las libras de las
          batidas 1–4 salen del reparto: se llenan después de hacerlo, y si
          cambiás números aquí, volvé a hacer el reparto
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
              <th
                className="border-l px-2 py-2 text-left font-semibold"
                title="Cuánto se decora en cada batida (del reparto): 21*6 = 21 en la primera y 6 en la segunda"
              >
                Dec
                <span className="block font-normal normal-case">1*2*3*4</span>
              </th>
              <th
                className="border-l px-2 py-2 text-left font-semibold"
                title="Cuánto se hornea en cada batida (del reparto)"
              >
                Prod
                <span className="block font-normal normal-case">1*2*3*4</span>
              </th>
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
                    cambios: principal.cambios,
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
                        <Texto valor={formatoTandas(batidas.dec[p.id] ?? [])} className="border-l" />
                        <Texto valor={formatoTandas(batidas.prod[p.id] ?? [])} className="border-l" />
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
                        <CeldasLibras libras={librasProducto(batidas, p.id)} />
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
                      dec={sumarTandas(paraTotal.map((f) => batidas.dec[f.p.id]))}
                      prod={sumarTandas(paraTotal.map((f) => batidas.prod[f.p.id]))}
                      libras={sumarTandas(paraTotal.map((f) => librasProducto(batidas, f.p.id)))}
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
      <Texto valor={formatoTandas(dec)} className="border-l" />
      <Texto valor={formatoTandas(prod)} className="border-l" />
      {principal !== null && <Numero valor={principal} className="border-l font-bold" />}
      <td className="border-l px-2 py-1.5 text-right tabular-nums">{total || ""}</td>
      <CeldasLibras libras={libras} total />
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

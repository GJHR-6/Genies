"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ChipColorDia } from "@/components/color-dia";
import {
  COLUMNAS_ASIGNACION,
  aAsignacion,
  idsAreasEnEquipo,
  nombreHoja,
  nombreProducto,
  type AsignacionDia,
  type DatosReparto,
  type PasteleraDia,
  type PlanDia,
} from "@/lib/asignaciones";
import { idsDelEquipo, tareasPorTanda } from "@/lib/secciones-reparto";
import { resumirAvance } from "@/lib/reparto";

const INACTIVIDAD_MS = 3 * 60_000;

type Props = { fecha: string; fechaLegible: string; datos: DatosReparto };
type EstadoDia = { plan: PlanDia; asignaciones: AsignacionDia[] };
type Sesion = { pastelera: PasteleraDia; pin: string };

export function CocinaCliente({ fecha, fechaLegible, datos }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const clave = useMemo(() => ["cocina", fecha], [fecha]);
  const [pidiendoPin, setPidiendoPin] = useState<PasteleraDia | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: clave,
    queryFn: async (): Promise<EstadoDia> => {
      const [planRes, asigRes] = await Promise.all([
        supabase
          .from("planes_dia")
          .select("estado, generado_at, publicado_at")
          .eq("fecha", fecha)
          .maybeSingle(),
        supabase.from("asignaciones").select(COLUMNAS_ASIGNACION).eq("fecha", fecha),
      ]);
      if (planRes.error) throw new Error(planRes.error.message);
      if (asigRes.error) throw new Error(asigRes.error.message);
      return {
        plan: planRes.data
          ? {
              estado: planRes.data.estado === "publicado" ? "publicado" : "borrador",
              generado_at: planRes.data.generado_at,
              publicado_at: planRes.data.publicado_at,
            }
          : null,
        asignaciones: (asigRes.data ?? []).map(aAsignacion),
      };
    },
    initialData: { plan: datos.plan, asignaciones: datos.asignaciones },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const invalidar = () => {
      void queryClient.invalidateQueries({ queryKey: ["cocina", fecha] });
    };
    const canal = supabase
      .channel(`cocina-${fecha}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asignaciones", filter: `fecha=eq.${fecha}` },
        invalidar
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "planes_dia", filter: `fecha=eq.${fecha}` },
        invalidar
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, queryClient, fecha]);

  // Inactividad: la tablet vuelve sola a la lista de nombres.
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salir = useCallback(() => {
    setSesion(null);
    setPidiendoPin(null);
  }, []);
  const reiniciarTemporizador = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(salir, INACTIVIDAD_MS);
  }, [salir]);
  useEffect(() => {
    if (!sesion && !pidiendoPin) return;
    reiniciarTemporizador();
    const eventos = ["pointerdown", "keydown"] as const;
    eventos.forEach((e) => window.addEventListener(e, reiniciarTemporizador));
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, reiniciarTemporizador));
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [sesion, pidiendoPin, reiniciarTemporizador]);

  const publicado = data.plan?.estado === "publicado";

  const elegir = (p: PasteleraDia) => {
    setMensaje(null);
    if (p.requiere_pin) setPidiendoPin(p);
    else setSesion({ pastelera: p, pin: "" });
  };

  // Si despublican el reparto, se vuelve a la portada aunque haya sesión.
  if (sesion && publicado) {
    return (
      <TrabajoPastelera
        sesion={sesion}
        fecha={fecha}
        fechaLegible={fechaLegible}
        datos={datos}
        asignaciones={data.asignaciones}
        onSalir={salir}
        onPinInvalido={() => {
          salir();
          setMensaje("Tu PIN cambió. Volvé a entrar.");
        }}
      />
    );
  }

  if (pidiendoPin && publicado) {
    return (
      <TecladoPin
        pastelera={pidiendoPin}
        onCancelar={() => setPidiendoPin(null)}
        onValido={(pin) => {
          setSesion({ pastelera: pidiendoPin, pin });
          setPidiendoPin(null);
        }}
      />
    );
  }

  const areaPorId = new Map(datos.areas.map((a) => [a.id, a]));
  // En un área en equipo, todas ven (y marcan) la hoja compartida.
  const areasEnEquipo = idsAreasEnEquipo(datos.areas);
  const deEquipo = (p: PasteleraDia) =>
    data.asignaciones.filter(
      (a) =>
        a.pastelera_id !== null &&
        idsDelEquipo(p, datos.pasteleras, areasEnEquipo).includes(a.pastelera_id) &&
        a.cantidad > 0
    );
  const conTrabajo = datos.pasteleras
    .filter((p) => p.activa || data.asignaciones.some((a) => a.pastelera_id === p.id))
    .filter((p) => deEquipo(p).length > 0)
    .sort(
      (a, b) =>
        (areaPorId.get(a.area_id)?.orden ?? 99) - (areaPorId.get(b.area_id)?.orden ?? 99) ||
        a.orden - b.orden
    );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">¿Quién sos?</h1>
          <p className="text-base text-muted-foreground">{fechaLegible}</p>
        </div>
        <ChipColorDia fecha={fecha} conEtiqueta />
      </div>

      {mensaje && (
        <p role="status" className="rounded-md bg-aviso/10 px-4 py-3 text-base font-medium text-aviso">
          {mensaje}
        </p>
      )}

      {!publicado ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-xl font-semibold">El reparto de hoy todavía no está listo</p>
          <p className="mt-2 text-base text-muted-foreground">
            Administración lo publica después de revisar los cuadros. Esta
            pantalla se actualiza sola.
          </p>
        </div>
      ) : conTrabajo.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-lg text-muted-foreground">
          No hay trabajo asignado para hoy.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conTrabajo.map((p) => {
            const avance = resumirAvance(deEquipo(p));
            const equipo = areasEnEquipo.has(p.area_id)
              ? nombreHoja(p, datos.pasteleras, areasEnEquipo)
              : null;
            const completo = avance.tareas > 0 && avance.listas === avance.tareas;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => elegir(p)}
                className={`flex min-h-32 flex-col justify-between rounded-xl border-2 p-5 text-left shadow-sm transition active:scale-[0.98] ${
                  completo ? "border-exito bg-exito/5" : "border-border bg-card hover:border-primary"
                }`}
              >
                <div>
                  <p className="text-2xl font-bold">{p.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {areaPorId.get(p.area_id)?.nombre}
                    {equipo && equipo !== p.nombre ? ` · hoja de ${equipo}` : ""}
                    {p.requiere_pin ? " · con PIN" : ""}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-base font-medium tabular-nums">
                    {completo ? "✓ Todo listo" : `${avance.listas} de ${avance.tareas} listas`}
                  </p>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-exito transition-all"
                      style={{
                        width: `${avance.total ? Math.round((avance.hechas / avance.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TecladoPin({
  pastelera,
  onCancelar,
  onValido,
}: {
  pastelera: PasteleraDia;
  onCancelar: () => void;
  onValido: (pin: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  const verificar = async (completo: string) => {
    setVerificando(true);
    const { data, error: err } = await supabase.rpc("verificar_pin_pastelera", {
      p_pastelera: pastelera.id,
      p_pin: completo,
    });
    setVerificando(false);
    if (err) {
      setError("Sin conexión. Intentá de nuevo.");
      setPin("");
      return;
    }
    if (data) onValido(completo);
    else {
      setError("PIN incorrecto");
      setPin("");
    }
  };

  const tocar = (d: string) => {
    if (verificando) return;
    setError(null);
    const nuevo = (pin + d).slice(0, 4);
    setPin(nuevo);
    if (nuevo.length === 4) void verificar(nuevo);
  };

  return (
    <section className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 py-4">
      <h1 className="text-2xl font-bold">Hola, {pastelera.nombre}</h1>
      <p className="text-base text-muted-foreground">Escribí tu PIN de 4 números</p>
      <div className="flex gap-4" aria-label={`${pin.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`size-5 rounded-full border-2 ${i < pin.length ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
          />
        ))}
      </div>
      <p role="status" className="h-6 text-base font-semibold text-destructive">
        {verificando ? <span className="text-muted-foreground">Verificando…</span> : error}
      </p>
      <div className="grid w-full grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => tocar(d)}
            className="h-16 rounded-xl border-2 bg-card text-2xl font-bold active:bg-accent"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={onCancelar}
          className="h-16 rounded-xl text-base font-medium text-muted-foreground active:bg-accent"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => tocar("0")}
          className="h-16 rounded-xl border-2 bg-card text-2xl font-bold active:bg-accent"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="h-16 rounded-xl text-base font-medium text-muted-foreground active:bg-accent"
          aria-label="Borrar"
        >
          ⌫ Borrar
        </button>
      </div>
    </section>
  );
}

function TrabajoPastelera({
  sesion,
  fecha,
  fechaLegible,
  datos,
  asignaciones,
  onSalir,
  onPinInvalido,
}: {
  sesion: Sesion;
  fecha: string;
  fechaLegible: string;
  datos: DatosReparto;
  asignaciones: AsignacionDia[];
  onSalir: () => void;
  onPinInvalido: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const productoPorId = useMemo(
    () => new Map(datos.productos.map((p) => [p.id, p])),
    [datos.productos]
  );
  const area = datos.areas.find((a) => a.id === sesion.pastelera.area_id);

  const avanzar = useMutation({
    mutationFn: async (vars: { id: number; hecha: number; estado?: AsignacionDia["estado"] }) => {
      const { data, error: err } = await supabase.rpc("registrar_avance", {
        p_asignacion: vars.id,
        p_pin: sesion.pin,
        p_hecha: vars.hecha,
        p_pastelera: sesion.pastelera.id,
        ...(vars.estado ? { p_estado: vars.estado } : {}),
      });
      if (err) throw new Error(err.message);
      return data;
    },
    // Errores de red: reintenta con backoff. PIN o permisos: no tiene caso.
    retry: (intentos, e) =>
      intentos < 5 && !(e instanceof Error && /PIN|permiso|publicado/i.test(e.message)),
    onMutate: (vars) => {
      // Optimista: la tablet responde al toque aunque el internet sea lento.
      queryClient.setQueryData<{ plan: PlanDia; asignaciones: AsignacionDia[] }>(
        ["cocina", fecha],
        (prev) =>
          prev && {
            ...prev,
            asignaciones: prev.asignaciones.map((a) =>
              a.id === vars.id
                ? {
                    ...a,
                    cantidad_hecha: vars.estado === "listo" ? a.cantidad : vars.hecha,
                    estado:
                      vars.estado ??
                      (vars.hecha >= a.cantidad ? "listo" : vars.hecha > 0 ? "en_proceso" : "pendiente"),
                  }
                : a
            ),
          }
      );
    },
    onSuccess: () => setError(null),
    onError: (e) => {
      if (e instanceof Error && e.message.includes("PIN")) onPinInvalido();
      else setError("No se pudo guardar. Se reintenta solo; revisá el internet.");
      void queryClient.invalidateQueries({ queryKey: ["cocina", fecha] });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cocina", fecha] });
    },
  });

  // Las suyas y, si trabaja en equipo, las de la hoja compartida.
  const idsEquipo = idsDelEquipo(
    sesion.pastelera,
    datos.pasteleras,
    idsAreasEnEquipo(datos.areas)
  );
  const propias = asignaciones.filter(
    (a) => a.pastelera_id !== null && idsEquipo.includes(a.pastelera_id) && a.cantidad > 0
  );
  const avance = resumirAvance(propias);
  const grupos = tareasPorTanda(asignaciones, idsEquipo);
  const orden = (id: number) => productoPorId.get(id)?.orden_area ?? 9999;

  return (
    <section className="flex flex-col gap-4">
      <div className="sticky top-[65px] z-[5] -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-2xl font-bold">{sesion.pastelera.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {area?.nombre}
            {area?.trabajo_en_equipo
              ? ` · hoja compartida de ${nombreHoja(
                  sesion.pastelera,
                  datos.pasteleras,
                  idsAreasEnEquipo(datos.areas)
                )}`
              : ""}{" "}
            · {fechaLegible}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ChipColorDia fecha={fecha} conEtiqueta />
          <button
            type="button"
            onClick={onSalir}
            className="h-12 rounded-xl border-2 px-5 text-base font-semibold active:bg-accent"
          >
            Salir
          </button>
        </div>
        <div className="w-full">
          <p className="text-sm font-medium tabular-nums">
            {avance.listas} de {avance.tareas} listas · {avance.hechas} de {avance.total} unidades
          </p>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-exito transition-all"
              style={{ width: `${avance.total ? Math.round((avance.hechas / avance.total) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="status" className="rounded-md bg-destructive/10 px-4 py-3 text-base font-medium text-destructive">
          {error}
        </p>
      )}

      {grupos.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-lg text-muted-foreground">
          No tenés trabajo asignado hoy.
        </p>
      )}

      {grupos.map(({ tanda, tareas }) => (
        <div key={tanda} className="flex flex-col gap-3">
          <h2 className="text-lg font-bold uppercase tracking-wide">Tanda {tanda}</h2>
          {[...tareas]
            .sort(
              (a, b) =>
                (a.tipo === b.tipo ? 0 : a.tipo === "produccion" ? -1 : 1) ||
                orden(a.producto_id) - orden(b.producto_id)
            )
            .map((t) => {
              const p = productoPorId.get(t.producto_id);
              const listo = t.estado === "listo";
              return (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center gap-4 rounded-xl border-2 p-4 ${
                    listo ? "border-exito bg-exito/5" : "bg-card"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xl font-bold ${listo ? "text-exito" : ""}`}>
                      {p ? nombreProducto(p) : `Producto ${t.producto_id}`}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                        t.tipo === "decoracion"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {t.tipo === "decoracion" ? "Decorar" : "Producir"}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-black tabular-nums leading-none">{t.cantidad}</p>
                    <p className="text-xs text-muted-foreground">a hacer</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Una menos"
                      disabled={t.cantidad_hecha <= 0}
                      onClick={() => avanzar.mutate({ id: t.id, hecha: t.cantidad_hecha - 1 })}
                      className="size-14 rounded-xl border-2 text-3xl font-bold active:bg-accent disabled:opacity-30"
                    >
                      −
                    </button>
                    <div className="w-14 text-center">
                      <p className="text-2xl font-bold tabular-nums">{t.cantidad_hecha}</p>
                      <p className="text-xs text-muted-foreground">hechas</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Una más"
                      onClick={() => avanzar.mutate({ id: t.id, hecha: t.cantidad_hecha + 1 })}
                      className="size-14 rounded-xl border-2 text-3xl font-bold active:bg-accent"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      listo
                        ? avanzar.mutate({ id: t.id, hecha: 0, estado: "pendiente" })
                        : avanzar.mutate({ id: t.id, hecha: t.cantidad, estado: "listo" })
                    }
                    className={`h-14 min-w-36 rounded-xl px-5 text-lg font-bold ${
                      listo
                        ? "border-2 text-muted-foreground active:bg-accent"
                        : "bg-exito text-primary-foreground active:bg-exito/80"
                    }`}
                  >
                    {listo ? "Deshacer" : "✓ Listo"}
                  </button>
                </div>
              );
            })}
        </div>
      ))}
    </section>
  );
}

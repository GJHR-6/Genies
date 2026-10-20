"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/types";
import { ChipColorDia } from "@/components/color-dia";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Producto = {
  id: number;
  nombre: string;
  categoria: string | null;
  tamano: string | null;
  lleva_decoracion: boolean;
};

type MovimientoInicial = {
  producto_id: number;
  saldo_inicial: number;
  ingreso: number;
  devolucion: number;
  pedido: number;
  cambio: number;
  decorado: number;
  sin_decorar: number;
};

type Campo =
  | "ingreso"
  | "devolucion"
  | "pedido"
  | "cambio"
  | "decorado"
  | "sin_decorar";
type ValoresFila = Record<Campo, string>;
type EstadoFila = "guardando" | "guardado" | "pendiente" | "error";

const FILA_VACIA: ValoresFila = {
  ingreso: "",
  devolucion: "",
  pedido: "",
  cambio: "",
  decorado: "",
  sin_decorar: "",
};

const CAMPOS: Campo[] = [
  "ingreso",
  "devolucion",
  "pedido",
  "cambio",
  "decorado",
  "sin_decorar",
];

const CLAVE_ORDEN = "genies:orden-inventario";

function aEntero(valor: string): number {
  const n = parseInt(valor, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function esErrorDeRed(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /fetch|network|conexi|timeout|abort/i.test(mensaje);
}

function BadgeEstado({ estado }: { estado: EstadoFila | undefined }) {
  if (!estado) return null;
  const estilos: Record<EstadoFila, { texto: string; clase: string }> = {
    guardando: { texto: "Guardando…", clase: "text-muted-foreground" },
    guardado: { texto: "Guardado ✓", clase: "text-exito" },
    pendiente: { texto: "Guardando…", clase: "text-aviso" },
    error: { texto: "No se pudo guardar", clase: "text-destructive" },
  };
  const { texto, clase } = estilos[estado];
  return (
    <span className={`shrink-0 text-xs font-medium ${clase}`}>{texto}</span>
  );
}

type Props = {
  fecha: string;
  fechaLegible: string;
  sucursalId: number;
  sucursalNombre: string;
  userId: string;
  esPrincipal: boolean;
  cerradoInicial: boolean;
  productos: Producto[];
  movimientosIniciales: MovimientoInicial[];
  saldosAnteriores: Record<number, number>;
};

export function CapturaCliente({
  fecha,
  fechaLegible,
  sucursalId,
  sucursalNombre,
  userId,
  esPrincipal,
  cerradoInicial,
  productos,
  movimientosIniciales,
  saldosAnteriores,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [valores, setValores] = useState<Record<number, ValoresFila>>(() => {
    const inicial: Record<number, ValoresFila> = {};
    for (const m of movimientosIniciales) {
      inicial[m.producto_id] = {
        ingreso: m.ingreso ? String(m.ingreso) : "",
        devolucion: m.devolucion ? String(m.devolucion) : "",
        pedido: m.pedido ? String(m.pedido) : "",
        cambio: m.cambio ? String(m.cambio) : "",
        decorado: m.decorado ? String(m.decorado) : "",
        sin_decorar: m.sin_decorar ? String(m.sin_decorar) : "",
      };
    }
    return inicial;
  });
  const [estados, setEstados] = useState<Record<number, EstadoFila>>({});
  const [guardadas, setGuardadas] = useState<Set<number>>(
    () => new Set(movimientosIniciales.map((m) => m.producto_id))
  );
  const [busqueda, setBusqueda] = useState("");
  const [cerrado, setCerrado] = useState(cerradoInicial);
  // Arranca "en línea" igual en servidor y navegador (Node también tiene un
  // `navigator` global, sin onLine); el estado real se lee al montar.
  const [enLinea, setEnLinea] = useState(true);
  const [dialogoCierre, setDialogoCierre] = useState(false);
  const [avisoLive, setAvisoLive] = useState("");

  const valoresRef = useRef(valores);
  const cerradoRef = useRef(cerrado);
  useEffect(() => {
    cerradoRef.current = cerrado;
  }, [cerrado]);
  const suciasRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const reintentosRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const ultimoGuardadoRef = useRef<Map<number, string>>(
    new Map(
      movimientosIniciales.map((m) => [
        m.producto_id,
        JSON.stringify([
          m.ingreso,
          m.devolucion,
          m.pedido,
          m.cambio,
          m.decorado,
          m.sin_decorar,
        ]),
      ])
    )
  );

  const serializar = useCallback((productoId: number): string => {
    const v = valoresRef.current[productoId] ?? FILA_VACIA;
    return JSON.stringify(CAMPOS.map((campo) => aEntero(v[campo])));
  }, []);

  const marcarEstado = useCallback(
    (productoId: number, estado: EstadoFila) => {
      setEstados((prev) => ({ ...prev, [productoId]: estado }));
    },
    []
  );

  const mutacionGuardar = useMutation({
    mutationFn: async (vars: {
      productoId: number;
      payload: TablesInsert<"movimientos_diarios">;
      clave: string;
    }) => {
      const { error } = await supabase
        .from("movimientos_diarios")
        .upsert(vars.payload, { onConflict: "fecha,sucursal_id,producto_id" });
      if (error) throw new Error(error.message);
    },
    retry: (intentos, error) => esErrorDeRed(error) && intentos < 3,
    onSuccess: (_datos, { productoId, clave }) => {
      ultimoGuardadoRef.current.set(productoId, clave);
      setGuardadas((prev) => {
        if (prev.has(productoId)) return prev;
        const nuevo = new Set(prev);
        nuevo.add(productoId);
        return nuevo;
      });
      if (serializar(productoId) !== clave) {
        // La usuaria siguió escribiendo mientras se guardaba.
        guardarFilaRef.current(productoId);
      } else {
        marcarEstado(productoId, "guardado");
        setAvisoLive("Guardado");
      }
    },
    onError: (error, { productoId }) => {
      if (esErrorDeRed(error)) {
        marcarEstado(productoId, "pendiente");
        setAvisoLive("Sin conexión, reintentando");
        const previo = reintentosRef.current.get(productoId);
        if (previo) clearTimeout(previo);
        reintentosRef.current.set(
          productoId,
          setTimeout(() => guardarFilaRef.current(productoId), 12_000)
        );
      } else {
        marcarEstado(productoId, "error");
        setAvisoLive("Error al guardar");
      }
    },
  });

  const guardarFila = useCallback(
    (productoId: number) => {
      if (cerradoRef.current) return;
      if (!suciasRef.current.has(productoId)) return;
      const clave = serializar(productoId);
      if (ultimoGuardadoRef.current.get(productoId) === clave) return;

      const v = valoresRef.current[productoId] ?? FILA_VACIA;
      const payload: TablesInsert<"movimientos_diarios"> = {
        fecha,
        sucursal_id: sucursalId,
        producto_id: productoId,
        saldo_inicial: saldosAnteriores[productoId] ?? 0,
        ingreso: aEntero(v.ingreso),
        devolucion: aEntero(v.devolucion),
        pedido: aEntero(v.pedido),
        cambio: aEntero(v.cambio),
        decorado: aEntero(v.decorado),
        sin_decorar: aEntero(v.sin_decorar),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };
      marcarEstado(
        productoId,
        typeof navigator !== "undefined" && !navigator.onLine
          ? "pendiente"
          : "guardando"
      );
      mutacionGuardar.mutate({ productoId, payload, clave });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fecha, sucursalId, userId, saldosAnteriores, serializar, marcarEstado]
  );
  const guardarFilaRef = useRef(guardarFila);
  useEffect(() => {
    guardarFilaRef.current = guardarFila;
  }, [guardarFila]);

  const alCambiar = (productoId: number, campo: Campo, crudo: string) => {
    const limpio = crudo.replace(/\D/g, "").slice(0, 5);
    const fila = valoresRef.current[productoId] ?? FILA_VACIA;
    const nueva = { ...fila, [campo]: limpio };
    valoresRef.current = { ...valoresRef.current, [productoId]: nueva };
    setValores(valoresRef.current);
    suciasRef.current.add(productoId);

    const previo = timersRef.current.get(productoId);
    if (previo) clearTimeout(previo);
    timersRef.current.set(
      productoId,
      setTimeout(() => guardarFilaRef.current(productoId), 800)
    );
  };

  const alSalirDelCampo = (productoId: number) => {
    const previo = timersRef.current.get(productoId);
    if (previo) clearTimeout(previo);
    guardarFilaRef.current(productoId);
  };

  // Reintento global al recuperar conexión + indicador en línea.
  useEffect(() => {
    const alVolver = () => {
      setEnLinea(true);
      for (const productoId of suciasRef.current) {
        if (
          ultimoGuardadoRef.current.get(productoId) !== serializar(productoId)
        ) {
          guardarFilaRef.current(productoId);
        }
      }
    };
    const alCaer = () => setEnLinea(false);
    if (!navigator.onLine) alCaer();
    window.addEventListener("online", alVolver);
    window.addEventListener("offline", alCaer);
    return () => {
      window.removeEventListener("online", alVolver);
      window.removeEventListener("offline", alCaer);
    };
  }, [serializar]);

  // Aviso al salir con cambios sin guardar.
  const haySinGuardar = Object.values(estados).some(
    (e) => e === "guardando" || e === "pendiente"
  );
  useEffect(() => {
    if (!haySinGuardar) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [haySinGuardar]);

  const mutacionCierre = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cierres_dia").upsert(
        {
          fecha,
          sucursal_id: sucursalId,
          estado: "cerrado",
          cerrado_at: new Date().toISOString(),
          cerrado_by: userId,
        },
        { onConflict: "fecha,sucursal_id" }
      );
      if (error) throw new Error(error.message);
    },
    retry: (intentos, error) => esErrorDeRed(error) && intentos < 3,
    onSuccess: () => {
      setCerrado(true);
      setDialogoCierre(false);
    },
  });

  // Orden de la lista: el del Excel (por sección) o A–Z. Cada tablet o
  // teléfono recuerda su elección (solo comodidad: si falla, queda Excel).
  const [ordenAZ, setOrdenAZ] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrdenAZ(localStorage.getItem(CLAVE_ORDEN) === "az");
    } catch {
      /* sin almacenamiento: orden del Excel */
    }
  }, []);
  const cambiarOrden = (az: boolean) => {
    setOrdenAZ(az);
    try {
      localStorage.setItem(CLAVE_ORDEN, az ? "az" : "excel");
    } catch {
      /* sin almacenamiento: vale solo para esta visita */
    }
  };

  const grupos = useMemo(() => {
    // Cada palabra debe aparecer en nombre, tamaño o categoría:
    // "choco 10" encuentra "CHOCOLATE · 10X2".
    const palabras = normalizar(busqueda.trim()).split(/\s+/).filter(Boolean);
    const visibles =
      palabras.length > 0
        ? productos.filter((p) => {
            const texto = normalizar(
              `${p.nombre} ${p.tamano ?? ""} ${p.categoria ?? ""}`
            );
            return palabras.every((w) => texto.includes(w));
          })
        : productos;
    if (ordenAZ) {
      const etiqueta = (p: Producto) => `${p.nombre} ${p.tamano ?? ""}`;
      const ordenados = [...visibles].sort((a, b) =>
        etiqueta(a).localeCompare(etiqueta(b), "es", { numeric: true })
      );
      return ordenados.length > 0
        ? ([["De la A a la Z", ordenados]] as [string, Producto[]][])
        : [];
    }
    const porCategoria = new Map<string, Producto[]>();
    for (const p of visibles) {
      const cat = p.categoria ?? "Sin categoría";
      const lista = porCategoria.get(cat);
      if (lista) lista.push(p);
      else porCategoria.set(cat, [p]);
    }
    return [...porCategoria.entries()];
  }, [productos, busqueda, ordenAZ]);

  const total = productos.length;
  const capturados = guardadas.size;
  const sinCapturar = total - capturados;

  return (
    <section className="flex flex-col gap-3">
      {/* Encabezado fijo: sucursal, fecha, progreso y buscador */}
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background px-4 pb-3 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold leading-tight">Inventario de hoy</h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {capturados} de {total} anotados
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            {sucursalNombre} · {fechaLegible}
          </span>
          <ChipColorDia fecha={fecha} />
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={capturados}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Avance del inventario"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: total ? `${(capturados / total) * 100}%` : "0%" }}
          />
        </div>
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto…"
          aria-label="Buscar producto"
          className="mt-2 h-11"
        />
        <div
          role="group"
          aria-label="Orden de la lista"
          className="mt-2 flex items-center gap-2 text-xs"
        >
          <span className="text-muted-foreground">Ordenar:</span>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(
              [
                [false, "Como el Excel"],
                [true, "A–Z"],
              ] as const
            ).map(([az, etiqueta]) => (
              <button
                key={etiqueta}
                type="button"
                aria-pressed={ordenAZ === az}
                onClick={() => cambiarOrden(az)}
                className={`min-h-8 rounded-full px-3 font-medium ${
                  ordenAZ === az
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
        {!cerrado && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Anotá lo que entró, lo que devolviste y los pedidos. Cada número se
            guarda solo.
          </p>
        )}
        {!enLinea && (
          <p
            role="status"
            className="mt-2 rounded-md bg-aviso/10 px-3 py-1.5 text-xs font-medium text-aviso"
          >
            Sin internet: seguí anotando, se guarda solo cuando vuelva la señal.
          </p>
        )}
        {cerrado && (
          <p
            role="status"
            className="mt-2 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            Ya terminaste el inventario de hoy. Si hay que corregir algo, pedile a administración que lo vuelva a abrir.
          </p>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {avisoLive}
      </p>

      {total === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Aún no hay productos en el catálogo. Contactá a la administración.
        </p>
      )}

      {total > 0 && grupos.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Ningún producto coincide con &ldquo;{busqueda}&rdquo;.
        </p>
      )}

      {grupos.map(([categoria, lista]) => (
        <div key={categoria} className="space-y-2">
          <h2 className="pt-1 text-sm font-semibold text-muted-foreground">
            {categoria}
          </h2>
          {lista.map((producto) => {
            const v = valores[producto.id] ?? FILA_VACIA;
            const conDecoracion = esPrincipal && producto.lleva_decoracion;
            return (
              <div
                key={producto.id}
                className="rounded-lg border bg-card p-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">
                      {producto.nombre}
                      {producto.tamano ? ` · ${producto.tamano}` : ""}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Saldo anterior: {saldosAnteriores[producto.id] ?? 0}
                    </p>
                  </div>
                  <BadgeEstado estado={estados[producto.id]} />
                </div>
                <div
                  className={`mt-2 grid gap-2 ${
                    esPrincipal ? "grid-cols-3" : "grid-cols-2 min-[400px]:grid-cols-4"
                  }`}
                >
                  {(
                    [
                      ["ingreso", "Ingreso"],
                      ["devolucion", "Devolución"],
                      ["pedido", "Pedido"],
                      // Cambio: lo que la tienda manda a Principal para
                      // cambiar (columna CM de la hoja completa).
                      ...(esPrincipal ? [] : [["cambio", "Cambio"]]),
                    ] as const as readonly (readonly [Campo, string])[]
                  ).map(([campo, etiqueta]) => (
                    <label key={campo} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {etiqueta}
                      </span>
                      <Input
                        inputMode="numeric"
                        value={v[campo]}
                        onChange={(e) =>
                          alCambiar(producto.id, campo, e.target.value)
                        }
                        onBlur={() => alSalirDelCampo(producto.id)}
                        disabled={cerrado}
                        placeholder="0"
                        className="h-11 text-base tabular-nums"
                        aria-label={`${etiqueta} de ${producto.nombre}${producto.tamano ? ` ${producto.tamano}` : ""}`}
                      />
                    </label>
                  ))}
                </div>
                {conDecoracion && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["decorado", "Decorado"],
                        ["sin_decorar", "Sin decorar"],
                      ] as const
                    ).map(([campo, etiqueta]) => (
                      <label key={campo} className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          {etiqueta}
                        </span>
                        <Input
                          inputMode="numeric"
                          value={v[campo]}
                          onChange={(e) =>
                            alCambiar(producto.id, campo, e.target.value)
                          }
                          onBlur={() => alSalirDelCampo(producto.id)}
                          disabled={cerrado}
                          placeholder="0"
                          className="h-11 text-base tabular-nums"
                          aria-label={`${etiqueta} de ${producto.nombre}${producto.tamano ? ` ${producto.tamano}` : ""}`}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {!cerrado && total > 0 && (
        <div className="pb-6 pt-2">
          <Button
            className="h-12 w-full bg-primary text-base hover:bg-primary/90"
            onClick={() => setDialogoCierre(true)}
          >
            Terminé el inventario de hoy
          </Button>
        </div>
      )}

      <Dialog open={dialogoCierre} onOpenChange={setDialogoCierre}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Terminaste el inventario?</DialogTitle>
            <DialogDescription>
              Anotaste {capturados} de {total} productos.
              {sinCapturar > 0
                ? ` Los ${sinCapturar} que no anotaste quedan en 0.`
                : " ¡Anotaste todos!"}{" "}
              Después ya no vas a poder cambiar números; solo administración
              puede corregir.
            </DialogDescription>
          </DialogHeader>
          {mutacionCierre.isError && (
            <p className="text-sm text-destructive">
              No se pudo guardar. Revisá que haya internet e intentá de nuevo.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setDialogoCierre(false)}
              disabled={mutacionCierre.isPending}
            >
              Seguir anotando
            </Button>
            <Button
              className="h-11 bg-primary hover:bg-primary/90"
              onClick={() => mutacionCierre.mutate()}
              disabled={mutacionCierre.isPending}
            >
              {mutacionCierre.isPending ? "Guardando…" : "Sí, terminé"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

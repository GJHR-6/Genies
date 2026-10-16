"use client";

import { useState } from "react";
import { KeyRound, Pencil, Store, TriangleAlert, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  cambiarContrasena,
  crearUsuario,
  guardarPerfil,
} from "@/lib/acciones/catalogos";
import type { RolUsuario } from "@/lib/roles";
import { EncabezadoCatalogo } from "../_componentes/encabezado";
import {
  AvisoError,
  Campo,
  Selector,
  numeroONull,
  useAccion,
} from "../_componentes/campos";

type Usuario = {
  user_id: string;
  email: string;
  nombre: string | null;
  rol: RolUsuario | null;
  sucursal_id: number | null;
  ultimo_ingreso: string | null;
};
type Sucursal = { id: number; nombre: string };

const ROLES: { valor: RolUsuario; etiqueta: string; descripcion: string }[] = [
  {
    valor: "tienda",
    etiqueta: "Tienda",
    descripcion: "Captura el inventario de su sucursal.",
  },
  {
    valor: "principal",
    etiqueta: "Principal",
    descripcion: "Como tienda, más los campos de decoración.",
  },
  {
    valor: "admin",
    etiqueta: "Administración",
    descripcion: "Ve todas las sucursales, sugeridos, cuadros y catálogos.",
  },
];

const ESTILO_ROL: Record<RolUsuario, string> = {
  admin: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  principal: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  tienda: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
};

function iniciales(texto: string) {
  return texto
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function ultimoIngreso(iso: string | null) {
  if (!iso) return "Nunca ha entrado";
  return `Último ingreso: ${new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(iso))}`;
}

type Modal =
  | { tipo: "nuevo" }
  | { tipo: "editar"; usuario: Usuario }
  | { tipo: "contrasena"; usuario: Usuario };

export function UsuariosCliente({
  usuarios,
  sucursales,
  miUserId,
  puedeAdministrarCuentas,
}: {
  usuarios: Usuario[];
  sucursales: Sucursal[];
  miUserId: string;
  puedeAdministrarCuentas: boolean;
}) {
  const [modal, setModal] = useState<Modal | null>(null);
  const nombreSucursal = new Map(sucursales.map((s) => [s.id, s.nombre]));
  const cerrar = () => setModal(null);

  return (
    <>
      <EncabezadoCatalogo actual="usuarios">
        <Button
          size="lg"
          onClick={() => setModal({ tipo: "nuevo" })}
          disabled={!puedeAdministrarCuentas}
        >
          <UserPlus />
          Nuevo usuario
        </Button>
      </EncabezadoCatalogo>

      {!puedeAdministrarCuentas && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Para crear cuentas o cambiar contraseñas falta configurar la llave
            de servicio en el servidor (<code>SUPABASE_SERVICE_ROLE_KEY</code>).
            Mientras tanto podés cambiar nombre, rol y sucursal.
          </p>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {usuarios.map((u) => {
          const soyYo = u.user_id === miUserId;
          return (
            <li
              key={u.user_id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {iniciales(u.nombre || u.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {u.nombre || "Sin nombre"}
                    {soyYo && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (vos)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {u.email}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    {u.rol ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-medium",
                          ESTILO_ROL[u.rol]
                        )}
                      >
                        {ROLES.find((r) => r.valor === u.rol)?.etiqueta}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-300">
                        Sin perfil: no puede entrar
                      </span>
                    )}
                    {u.sucursal_id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        <Store className="size-3" />
                        {nombreSucursal.get(u.sucursal_id)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  {ultimoIngreso(u.ultimo_ingreso)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModal({ tipo: "contrasena", usuario: u })}
                    disabled={!puedeAdministrarCuentas}
                  >
                    <KeyRound />
                    Contraseña
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModal({ tipo: "editar", usuario: u })}
                  >
                    <Pencil />
                    Editar
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={modal !== null} onOpenChange={(a) => !a && cerrar()}>
        {modal?.tipo === "nuevo" && (
          <FormularioPerfil sucursales={sucursales} alCerrar={cerrar} />
        )}
        {modal?.tipo === "editar" && (
          <FormularioPerfil
            key={modal.usuario.user_id}
            usuario={modal.usuario}
            esMiCuenta={modal.usuario.user_id === miUserId}
            sucursales={sucursales}
            alCerrar={cerrar}
          />
        )}
        {modal?.tipo === "contrasena" && (
          <FormularioContrasena
            key={modal.usuario.user_id}
            usuario={modal.usuario}
            alCerrar={cerrar}
          />
        )}
      </Dialog>
    </>
  );
}

/** Crear usuario (sin `usuario`) o editar nombre, rol y sucursal. */
function FormularioPerfil({
  usuario,
  esMiCuenta = false,
  sucursales,
  alCerrar,
}: {
  usuario?: Usuario;
  esMiCuenta?: boolean;
  sucursales: Sucursal[];
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rol, setRol] = useState<RolUsuario>(usuario?.rol ?? "tienda");
  const [sucursalId, setSucursalId] = useState<number | null>(
    usuario?.sucursal_id ?? null
  );
  const { enviando, error, ejecutar } = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const perfil = {
      nombre,
      rol,
      sucursal_id: rol === "admin" ? null : sucursalId,
    };
    ejecutar(
      () =>
        usuario
          ? guardarPerfil({ user_id: usuario.user_id, ...perfil })
          : crearUsuario({ email, contrasena, ...perfil }),
      alCerrar
    );
  }

  return (
    <DialogContent className="max-h-[92dvh] overflow-y-auto">
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {usuario
              ? usuario.email
              : "La persona entra con este correo y contraseña. Compartíselos en privado."}
          </DialogDescription>
        </DialogHeader>

        <Campo etiqueta="Nombre" htmlFor="usr-nombre">
          <Input
            id="usr-nombre"
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. María López"
            className="h-10"
          />
        </Campo>

        {!usuario && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Correo" htmlFor="usr-email">
              <Input
                id="usr-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </Campo>
            <Campo
              etiqueta="Contraseña"
              htmlFor="usr-pass"
              ayuda="Mínimo 8 caracteres."
            >
              <Input
                id="usr-pass"
                type="text"
                autoComplete="new-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="h-10"
              />
            </Campo>
          </div>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Rol</legend>
          {ROLES.map((r) => {
            const bloqueado = esMiCuenta && r.valor !== "admin";
            return (
              <label
                key={r.valor}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  rol === r.valor
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent/50",
                  bloqueado && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="radio"
                  name="rol"
                  value={r.valor}
                  checked={rol === r.valor}
                  disabled={bloqueado}
                  onChange={() => setRol(r.valor)}
                  className="mt-1 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">{r.etiqueta}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.descripcion}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {rol !== "admin" && (
          <Campo etiqueta="Sucursal" htmlFor="usr-sucursal">
            <Selector
              id="usr-sucursal"
              value={sucursalId ?? ""}
              onChange={(e) => setSucursalId(numeroONull(e.target.value))}
            >
              <option value="">— Elegí una sucursal —</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
        )}

        <AvisoError mensaje={error} />

        <DialogFooter>
          <Button type="button" variant="outline" size="lg" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? "Guardando…" : usuario ? "Guardar" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FormularioContrasena({
  usuario,
  alCerrar,
}: {
  usuario: Usuario;
  alCerrar: () => void;
}) {
  const [contrasena, setContrasena] = useState("");
  const [listo, setListo] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(
      () => cambiarContrasena({ user_id: usuario.user_id, contrasena }),
      () => setListo(true)
    );
  }

  return (
    <DialogContent>
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>{usuario.email}</DialogDescription>
        </DialogHeader>
        {listo ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Contraseña cambiada. Compartila con la persona en privado.
          </p>
        ) : (
          <Campo
            etiqueta="Contraseña nueva"
            htmlFor="pass-nueva"
            ayuda="Mínimo 8 caracteres."
          >
            <Input
              id="pass-nueva"
              type="text"
              autoFocus
              autoComplete="new-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="h-10"
            />
          </Campo>
        )}
        <AvisoError mensaje={error} />
        <DialogFooter>
          {listo ? (
            <Button type="button" size="lg" onClick={alCerrar}>
              Listo
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="lg" onClick={alCerrar}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" disabled={enviando}>
                {enviando ? "Guardando…" : "Cambiar contraseña"}
              </Button>
            </>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

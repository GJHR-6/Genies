import {
  CakeSlice,
  ChefHat,
  ClipboardList,
  HandHeart,
  Layers,
  Printer,
  Split,
  Store,
  Target,
  Users,
} from "lucide-react";
import type { Grupo } from "@/components/encabezado-seccion";

/**
 * Pantallas del trabajo diario del admin. El número de paso solo sugiere el
 * orden habitual; cada pantalla se abre sola desde su botón.
 */
export const GRUPO_HOY = {
  inicio: { href: "/hoy", etiqueta: "Hoy" },
  secciones: [
    {
      clave: "tiendas",
      href: "/dashboard",
      titulo: "Tiendas",
      descripcion: "Qué tiendas ya terminaron de contar su inventario de hoy.",
      icono: Store,
      color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      paso: 1,
    },
    {
      clave: "sugeridos",
      href: "/sugeridos",
      titulo: "Sugeridos",
      descripcion: "Cuánto hay que producir para cada tienda. Podés cambiar cualquier número.",
      icono: ClipboardList,
      color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      paso: 2,
    },
    {
      clave: "cuadros",
      href: "/cuadros",
      titulo: "Cuadros",
      descripcion: "Las hojas de producción de cada área, listas para imprimir.",
      icono: Printer,
      color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      paso: 3,
    },
    {
      clave: "reparto",
      href: "/asignar",
      titulo: "Reparto",
      descripcion: "Divide el trabajo entre las pasteleras y saca la hoja de cada una para imprimir.",
      icono: Split,
      color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
      paso: 4,
    },
  ],
} as const satisfies Grupo;

/** Catálogos: datos que cambian poco. Cada uno es una pantalla independiente. */
export const GRUPO_CATALOGOS = {
  inicio: { href: "/catalogos", etiqueta: "Catálogos" },
  secciones: [
    {
      clave: "productos",
      href: "/catalogos/productos",
      titulo: "Productos",
      descripcion: "Agregá productos nuevos, cambiá nombres o dejá de producir alguno.",
      icono: CakeSlice,
      color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    },
    {
      clave: "reglas",
      href: "/catalogos/reglas",
      titulo: "Objetivos por tienda",
      descripcion: "Cuántas unidades debe tener cada tienda por día (base del sugerido).",
      icono: Target,
      color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    {
      clave: "pasteleras",
      href: "/pasteleras",
      titulo: "Pasteleras",
      descripcion: "Quién trabaja en cada área y con qué porcentaje.",
      icono: HandHeart,
      color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    },
    {
      clave: "areas",
      href: "/catalogos/areas",
      titulo: "Áreas de producción",
      descripcion: "Los cuadros de producción y qué productos lleva cada uno.",
      icono: ChefHat,
      color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    },
    {
      clave: "departamentos",
      href: "/catalogos/departamentos",
      titulo: "Departamentos",
      descripcion: "Las secciones en que se agrupan los productos.",
      icono: Layers,
      color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    },
    {
      clave: "usuarios",
      href: "/catalogos/usuarios",
      titulo: "Usuarios",
      descripcion: "Cuentas de las encargadas: sucursal, rol y contraseña.",
      icono: Users,
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
  ],
} as const satisfies Grupo;

export type ClaveHoy = (typeof GRUPO_HOY.secciones)[number]["clave"];
export type ClaveCatalogo = (typeof GRUPO_CATALOGOS.secciones)[number]["clave"];

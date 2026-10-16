import { CakeSlice, ChefHat, Layers, Target, Users } from "lucide-react";

/** Pantallas de catálogos: cada una es independiente y se abre desde un botón. */
export const SECCIONES = [
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
    clave: "areas",
    href: "/catalogos/areas",
    titulo: "Áreas de producción",
    descripcion: "Las pasteleras y qué cuadro de producción le toca a cada una.",
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
] as const;

export type ClaveSeccion = (typeof SECCIONES)[number]["clave"];

import { EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_CATALOGOS, type ClaveCatalogo } from "@/lib/grupos";

/** Encabezado de cada pantalla de catálogo (botones a los demás catálogos). */
export function EncabezadoCatalogo({
  actual,
  children,
}: {
  actual: ClaveCatalogo;
  /** Acciones a la derecha del título (p. ej. botón "Nuevo"). */
  children?: React.ReactNode;
}) {
  return (
    <EncabezadoSeccion grupo={GRUPO_CATALOGOS} actual={actual}>
      {children}
    </EncabezadoSeccion>
  );
}

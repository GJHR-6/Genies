import { z } from "zod";

/** Validaciones de los formularios de catálogos (P8), compartidas cliente/servidor. */

const textoRequerido = (campo: string) =>
  z
    .string()
    .trim()
    .min(1, `Escribí ${campo}.`)
    .max(80, `${campo[0].toUpperCase()}${campo.slice(1)} es demasiado largo.`);

/** Texto opcional: vacío se guarda como null. */
const textoOpcional = z
  .string()
  .trim()
  .max(80, "El texto es demasiado largo.")
  .transform((v) => (v === "" ? null : v))
  .nullable();

const idOpcional = z.number().int().positive().nullable();

export const esquemaProducto = z.object({
  id: z.number().int().positive().optional(),
  nombre: textoRequerido("el nombre"),
  tamano: textoOpcional,
  categoria: textoOpcional,
  departamento_id: idOpcional,
  area_id: idOpcional,
  orden_area: z.number().int().min(0).max(32000).nullable(),
  lleva_decoracion: z.boolean(),
  activo: z.boolean(),
});
export type DatosProducto = z.input<typeof esquemaProducto>;

export const esquemaDepartamento = z.object({
  id: z.number().int().positive().optional(),
  nombre: textoRequerido("el nombre"),
  activo: z.boolean(),
});
export type DatosDepartamento = z.input<typeof esquemaDepartamento>;

export const esquemaArea = z.object({
  id: z.number().int().positive().optional(),
  nombre: textoRequerido("el nombre"),
  encargadas: textoRequerido("las encargadas"),
  orden: z.number().int().min(1, "El orden empieza en 1.").max(100),
  activa: z.boolean(),
});
export type DatosArea = z.input<typeof esquemaArea>;

/** dia_semana: null = todos los días; 0=domingo … 6=sábado. objetivo null = borrar la regla. */
export const esquemaReglas = z.object({
  producto_id: z.number().int().positive(),
  cambios: z
    .array(
      z.object({
        sucursal_id: z.number().int().positive(),
        dia_semana: z.number().int().min(0).max(6).nullable(),
        objetivo: z.number().int().min(0).max(9999).nullable(),
      })
    )
    .min(1, "No hay cambios para guardar.")
    .max(200),
});
export type DatosReglas = z.input<typeof esquemaReglas>;

export const ROLES = ["tienda", "principal", "admin"] as const;

const perfilBase = {
  nombre: textoRequerido("el nombre"),
  rol: z.enum(ROLES),
  sucursal_id: idOpcional,
};

/** Tienda y principal necesitan sucursal; el admin no. */
function exigirSucursal(
  datos: { rol: (typeof ROLES)[number]; sucursal_id: number | null },
  ctx: z.RefinementCtx
) {
  if (datos.rol !== "admin" && datos.sucursal_id === null) {
    ctx.addIssue({
      code: "custom",
      path: ["sucursal_id"],
      message: "Elegí la sucursal de esta persona.",
    });
  }
}

export const esquemaPerfil = z
  .object({ user_id: z.uuid(), ...perfilBase })
  .superRefine(exigirSucursal);
export type DatosPerfil = z.input<typeof esquemaPerfil>;

const contrasena = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña es demasiado larga.");

export const esquemaNuevoUsuario = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Escribí un correo válido.")),
    contrasena,
    ...perfilBase,
  })
  .superRefine(exigirSucursal);
export type DatosNuevoUsuario = z.input<typeof esquemaNuevoUsuario>;

export const esquemaContrasena = z.object({
  user_id: z.uuid(),
  contrasena,
});

/** Primer mensaje de error legible de una validación fallida. */
export function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos del formulario.";
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import {
  esquemaArea,
  esquemaContrasena,
  esquemaDepartamento,
  esquemaNuevoUsuario,
  esquemaPerfil,
  esquemaProducto,
  esquemaReglas,
  primerError,
  type DatosArea,
  type DatosDepartamento,
  type DatosNuevoUsuario,
  type DatosPerfil,
  type DatosProducto,
  type DatosReglas,
} from "@/lib/esquemas-catalogos";

/**
 * Server Actions de catálogos (P8). Escriben con la sesión del admin, así
 * que el RLS (`es_admin()`) es la barrera real; el chequeo de rol aquí solo
 * da un mensaje claro. La service key se usa únicamente para Auth.
 */

export type Resultado = { ok: true } | { ok: false; error: string };

const SIN_PERMISO: Resultado = {
  ok: false,
  error: "Solo la administración puede cambiar los catálogos.",
};

const SIN_LLAVE =
  "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para administrar cuentas.";

async function exigirAdmin(): Promise<boolean> {
  const perfil = await obtenerPerfil();
  return perfil?.rol === "admin";
}

/** Traduce errores de Postgres a mensajes para la administradora. */
function mensajeBD(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Ya existe un registro con ese nombre.";
  if (error.code === "23503")
    return "No se puede borrar porque tiene datos relacionados.";
  if (error.code === "42501")
    return "Solo la administración puede cambiar los catálogos.";
  return "No se pudo guardar. Revisá la conexión e intentá de nuevo.";
}

export async function guardarProducto(datos: DatosProducto): Promise<Resultado> {
  if (!(await exigirAdmin())) return SIN_PERMISO;
  const v = esquemaProducto.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const { id, ...campos } = v.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("productos").update(campos).eq("id", id)
    : await supabase.from("productos").insert(campos);
  if (error) return { ok: false, error: mensajeBD(error) };

  revalidatePath("/catalogos", "layout");
  return { ok: true };
}

export async function guardarDepartamento(
  datos: DatosDepartamento
): Promise<Resultado> {
  if (!(await exigirAdmin())) return SIN_PERMISO;
  const v = esquemaDepartamento.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const { id, ...campos } = v.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("departamentos").update(campos).eq("id", id)
    : await supabase.from("departamentos").insert(campos);
  if (error) return { ok: false, error: mensajeBD(error) };

  revalidatePath("/catalogos", "layout");
  return { ok: true };
}

export async function guardarArea(datos: DatosArea): Promise<Resultado> {
  if (!(await exigirAdmin())) return SIN_PERMISO;
  const v = esquemaArea.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const { id, ...campos } = v.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("areas_produccion").update(campos).eq("id", id)
    : await supabase.from("areas_produccion").insert(campos);
  if (error) {
    if (error.code === "23505")
      return {
        ok: false,
        error: "Ya hay un área con ese nombre o con ese número de orden.",
      };
    return { ok: false, error: mensajeBD(error) };
  }

  revalidatePath("/catalogos", "layout");
  return { ok: true };
}

/**
 * Guarda los objetivos editados de un producto. Cada cambio reemplaza la
 * regla (producto, sucursal, día): se borra la existente y se inserta la
 * nueva. Se borra primero porque el unique no impide dos filas con
 * dia_semana null ("todos los días").
 */
export async function guardarReglas(datos: DatosReglas): Promise<Resultado> {
  if (!(await exigirAdmin())) return SIN_PERMISO;
  const v = esquemaReglas.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const { producto_id, cambios } = v.data;
  const supabase = await createClient();

  for (const c of cambios) {
    let borrar = supabase
      .from("reglas_sugerido")
      .delete()
      .eq("producto_id", producto_id)
      .eq("sucursal_id", c.sucursal_id);
    borrar =
      c.dia_semana === null
        ? borrar.is("dia_semana", null)
        : borrar.eq("dia_semana", c.dia_semana);
    const { error: errBorrar } = await borrar;
    if (errBorrar) return { ok: false, error: mensajeBD(errBorrar) };

    if (c.objetivo === null) continue;
    const { error: errInsertar } = await supabase.from("reglas_sugerido").insert({
      producto_id,
      sucursal_id: c.sucursal_id,
      dia_semana: c.dia_semana,
      objetivo: c.objetivo,
    });
    if (errInsertar) return { ok: false, error: mensajeBD(errInsertar) };
  }

  revalidatePath("/catalogos", "layout");
  revalidatePath("/sugeridos");
  return { ok: true };
}

export async function guardarPerfil(datos: DatosPerfil): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "admin") return SIN_PERMISO;
  const v = esquemaPerfil.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const { user_id, nombre, rol } = v.data;
  if (user_id === perfil.userId && rol !== "admin") {
    return {
      ok: false,
      error: "No podés quitarle el rol de administración a tu propia cuenta.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("perfiles").upsert({
    user_id,
    nombre,
    rol,
    sucursal_id: rol === "admin" ? null : v.data.sucursal_id,
  });
  if (error) return { ok: false, error: mensajeBD(error) };

  revalidatePath("/catalogos", "layout");
  return { ok: true };
}

export async function crearUsuario(
  datos: DatosNuevoUsuario
): Promise<Resultado> {
  if (!(await exigirAdmin())) return SIN_PERMISO;
  const v = esquemaNuevoUsuario.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SIN_LLAVE };

  const { email, contrasena, nombre, rol } = v.data;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: contrasena,
    email_confirm: true,
  });
  if (error || !data.user) {
    const existe = /already|registered|exists/i.test(error?.message ?? "");
    return {
      ok: false,
      error: existe
        ? "Ya existe un usuario con ese correo."
        : "No se pudo crear el usuario. Intentá de nuevo.",
    };
  }

  // El perfil se escribe con la sesión del admin (pasa por RLS).
  const supabase = await createClient();
  const { error: errPerfil } = await supabase.from("perfiles").upsert({
    user_id: data.user.id,
    nombre,
    rol,
    sucursal_id: rol === "admin" ? null : v.data.sucursal_id,
  });
  if (errPerfil) {
    // Sin perfil el usuario no sirve: deshacer para poder reintentar.
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: mensajeBD(errPerfil) };
  }

  revalidatePath("/catalogos", "layout");
  return { ok: true };
}

export async function cambiarContrasena(datos: {
  user_id: string;
  contrasena: string;
}): Promise<Resultado> {
  if (!(await exigirAdmin())) return SIN_PERMISO;
  const v = esquemaContrasena.safeParse(datos);
  if (!v.success) return { ok: false, error: primerError(v.error) };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SIN_LLAVE };

  const { error } = await admin.auth.admin.updateUserById(v.data.user_id, {
    password: v.data.contrasena,
  });
  if (error)
    return { ok: false, error: "No se pudo cambiar la contraseña." };
  return { ok: true };
}

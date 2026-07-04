import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esRutaAdmin, rutaInicio } from "@/lib/roles";
import type { Database } from "@/lib/types";

/**
 * Refresca la sesión de Supabase en cada request, mantiene las cookies
 * sincronizadas y protege rutas:
 *  - sin sesión → /login (conservando la URL de retorno en ?next=)
 *  - con sesión en /login → pantalla inicial según rol
 *  - rutas de admin → exigen rol admin (además del RLS en la BD)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no ejecutar lógica entre createServerClient y getUser().
  // Un error aquí puede cerrar sesiones de forma aleatoria.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaPublica =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Redirige conservando las cookies de sesión ya refrescadas.
  function redirigir(pathnameDestino: string, next?: string) {
    const url = request.nextUrl.clone();
    url.pathname = pathnameDestino;
    url.search = "";
    if (next) url.searchParams.set("next", next);
    const respuesta = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => respuesta.cookies.set(cookie));
    return respuesta;
  }

  if (!user) {
    if (esRutaPublica) return supabaseResponse;
    // Sesión expirada o inexistente: a login conservando la URL de retorno
    const next =
      pathname === "/" ? undefined : pathname + request.nextUrl.search;
    return redirigir("/login", next);
  }

  // Con sesión: el rol solo se consulta cuando la ruta lo requiere
  if (esRutaPublica || esRutaAdmin(pathname)) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("user_id", user.id)
      .maybeSingle();
    const rol = perfil?.rol ?? "tienda";

    if (esRutaPublica) return redirigir(rutaInicio(rol));
    if (rol !== "admin") return redirigir("/captura");
  }

  return supabaseResponse;
}

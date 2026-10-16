import Link from "next/link";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { cerrarSesion } from "@/lib/acciones/auth";
import { hoyTegucigalpa } from "@/lib/fechas";
import { ChipColorDia } from "@/components/color-dia";
import { MenuPrincipal } from "@/components/menu-principal";
import { rutaInicio } from "@/lib/roles";

const NOMBRE_ROL: Record<string, string> = {
  admin: "Administración",
  principal: "Principal",
  tienda: "Tienda",
};

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const perfil = await obtenerPerfil();

  if (!perfil) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Genies</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu usuario no tiene un perfil asignado. Contactá a la administración
          para que te asigne rol y sucursal.
        </p>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  const subtitulo =
    perfil.rol === "admin"
      ? NOMBRE_ROL.admin
      : perfil.sucursalNombre ?? NOMBRE_ROL[perfil.rol];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5">
          <Link
            href={rutaInicio(perfil.rol)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg sm:flex-none"
            aria-label="Ir al inicio"
          >
            <Image
              src="/logo-gennies.jpeg"
              alt=""
              width={38}
              height={38}
              className="shrink-0 rounded-md"
              priority
            />
            <div className="min-w-0">
              <p className="leading-tight font-semibold">Gennie&apos;s</p>
              <p className="truncate text-xs text-muted-foreground">
                {subtitulo}
                {perfil.nombre ? ` · ${perfil.nombre}` : ""}
              </p>
            </div>
          </Link>
          <div className="order-last w-full sm:order-none sm:w-auto">
            <MenuPrincipal rol={perfil.rol} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* El chip pone su propio inline-flex: se oculta con un envoltorio. */}
            <span className="hidden md:inline-flex">
              <ChipColorDia fecha={hoyTegucigalpa()} />
            </span>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-accent"
              >
                <LogOut className="size-4" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}

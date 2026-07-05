import Link from "next/link";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { cerrarSesion } from "@/lib/acciones/auth";

const NOMBRE_ROL: Record<string, string> = {
  admin: "Administración",
  principal: "Principal",
  tienda: "Tienda",
};

const NAV_ADMIN = [
  { href: "/dashboard", etiqueta: "Dashboard" },
  { href: "/sugeridos", etiqueta: "Sugeridos" },
  { href: "/historial", etiqueta: "Historial" },
];

const NAV_TIENDA = [
  { href: "/captura", etiqueta: "Captura" },
  { href: "/historial", etiqueta: "Historial" },
];

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
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold leading-tight">Genies</p>
            <p className="truncate text-xs text-muted-foreground">
              {subtitulo}
              {perfil.nombre ? ` · ${perfil.nombre}` : ""}
            </p>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {(perfil.rol === "admin" ? NAV_ADMIN : NAV_TIENDA).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.etiqueta}
              </Link>
            ))}
          </nav>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="min-h-11 rounded-md border px-4 text-sm font-medium"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4">
        {children}
      </main>
    </div>
  );
}

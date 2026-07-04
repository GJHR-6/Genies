"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rutaInicio } from "@/lib/roles";

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      // Sin revelar si el email existe; otras causas (red, config) se
      // distinguen para no diagnosticar mal una credencial válida.
      setError(
        !error || error.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : "No se pudo iniciar sesión. Revisá tu conexión e intentá de nuevo."
      );
      setCargando(false);
      return;
    }

    // Destino: URL de retorno (?next=) si es una ruta interna válida;
    // si no, la pantalla inicial según el rol del perfil.
    const next = searchParams.get("next");
    let destino: string;
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      destino = next;
    } else {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("user_id", data.user.id)
        .maybeSingle();
      destino = rutaInicio(perfil?.rol ?? "tienda");
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Genies</h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-base"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams exige un límite de Suspense al prerenderizar
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  );
}

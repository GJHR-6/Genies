"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rutaInicio } from "@/lib/roles";
import { olvidarCopiaSinInternet } from "@/components/modo-sin-internet";

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Ver la contraseña mientras se escribe (27 nov), si la persona quiere.
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Sin sesión: que no quede en la tablet la copia del inventario de nadie.
  useEffect(() => olvidarCopiaSinInternet(), []);

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
    // "/\\otro.com" el navegador lo toma como "//otro.com": se rechaza.
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
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
        <div className="space-y-3 text-center">
          <Image
            src="/logo-gennies.jpeg"
            alt="Gennie's — Repostería y Pastelería"
            width={96}
            height={96}
            className="mx-auto rounded-2xl shadow-sm"
            priority
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Gennie&apos;s</h1>
            <p className="text-sm text-muted-foreground">
              Repostería y Pastelería · Inicia sesión para continuar
            </p>
          </div>
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
            <div className="relative">
              <input
                id="password"
                type={verPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border py-2 pr-12 pl-3 text-base"
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? "Ocultar contraseña" : "Ver contraseña"}
                aria-pressed={verPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {verPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
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

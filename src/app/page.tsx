import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Genies</h1>
      <p className="text-muted-foreground">
        Sistema de inventario y producción diaria
      </p>
      {user && (
        <p className="text-sm text-muted-foreground">
          Sesión iniciada como {user.email}
        </p>
      )}
    </main>
  );
}

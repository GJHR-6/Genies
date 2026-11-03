import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: la convención "middleware" fue renombrada a "proxy".
// Refresca la sesión de Supabase y protege rutas en cada request.
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto estáticos e imágenes:
     * - _next/static, _next/image, favicon.ico
     * - imágenes (svg, png, jpg, jpeg, gif, webp)
     * - sw.js (modo sin internet: se instala sin sesión)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

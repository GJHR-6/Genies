# Proyecto Genies — Sistema de inventario y producción diaria

Sistema web para una pastelería en Honduras con 6 sucursales. Reemplaza un Excel manual: cada tienda captura su inventario diario y el sistema genera automáticamente los cuadros de producción por departamento.

## Documentación (leer antes de programar)

| Doc | Contenido |
|---|---|
| `docs/01-PRD.md` | Qué se construye y por qué; criterios de aceptación |
| `docs/02-TRD.md` | Stack, arquitectura, seguridad, estructura del repo |
| `docs/03-UIUX.md` | Pantallas, sistema visual, estados |
| `docs/04-flujo-app.md` | Flujos de usuario y reglas de negocio |
| `docs/05-schema.sql` | Esquema completo de Supabase (primera migración) |
| `docs/06-plan-implementacion.md` | Hitos, orden de trabajo y DoD |

## Stack
Next.js 14+ (App Router) · TypeScript estricto · Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS, Realtime) · TanStack Query · Zod · Vercel.

## Infraestructura
- Supabase: proyecto `genies` (ref `whlmbumdpqfndktlogpk`, us-east-1). Migración inicial ya aplicada (`supabase/migrations/0001_schema.sql`).
- Vercel: deploy vía integración MCP / dashboard.

## Reglas invariables
1. **RLS siempre**: tienda solo ve su sucursal; nunca exponer la service key al cliente.
2. **`vendido` se calcula, jamás se digita** (`v_movimientos`).
3. **Sugerido** = `objetivo − saldo` (vista `v_sugeridos`), con override manual del admin.
4. Guardado **por fila con reintento automático** — internet inestable en tiendas.
5. UI 100 % en español; términos del negocio: Ingreso, Devolución, Pedido, Sugerido, Cuadro.
6. Zona horaria del "día": `America/Tegucigalpa`.
7. Móvil primero en captura (360 px); escritorio en dashboard/cuadros.
8. El proyecto se llama **Genies** (los docs originales tenían el typo "Genios").

## Estado actual
M0, M1 y M3 completados: login/logout, perfil (rol + sucursal) con redirect por rol, protección de rutas en middleware (rutas admin exigen rol admin), tipos generados (`src/lib/types.ts`) y RLS verificada con dos usuarios de prueba (`admin@genies.test`, `cypress@genies.test` — sucursal Cypress). Seed aplicado en Supabase. M3 (captura diaria): pantalla P3 con guardado por fila (debounce 800 ms + reintento TanStack Query), decoración solo Principal, cierre del día con modo lectura; verificado contra Supabase (upsert, RLS, cierre). M4 (dashboard y sugeridos): dashboard admin con Realtime (migración 0002 agrega tablas a la publicación) y cerrar/reabrir día por sucursal, /sugeridos con override inline (update-luego-insert para no pisar capturas), /historial (P9) server-rendered con filtros GET, nav por rol en el layout. Usuarios de prueba: cypress@genies.test / PruebaM3-2026 · admin@genies.test / AdminGenies-2026. Siguiente: M5 (cuadros de producción); M2 espera el Excel del cliente. Nota: env vars de Vercel en prod/preview son tipo "sensitive" — `vercel env pull` las devuelve vacías por diseño; verificar en el bundle desplegado.

## Pendiente de datos del cliente
Catálogo de productos, departamentos y reglas de sugeridos se migran desde el Excel del cliente (hito M2). Mientras tanto, usar datos de prueba (`supabase/seed.sql`).

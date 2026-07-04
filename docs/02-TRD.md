# TRD â€” Documento de Requerimientos TÃ©cnicos
## Sistema de inventario y producciÃ³n diaria â€” Genies

**VersiÃ³n:** 1.0 Â· Complementa al PRD (01-PRD.md)

---

## 1. Stack tecnolÃ³gico

| Capa | TecnologÃ­a | JustificaciÃ³n |
|---|---|---|
| Frontend | **Next.js 14+ (App Router) + TypeScript** | PWA-ready, SSR para dashboard admin, un solo repo |
| UI | **Tailwind CSS + shadcn/ui** | RÃ¡pido, consistente, buen soporte mÃ³vil |
| Backend / BD | **Supabase** (PostgreSQL + Auth + RLS + Realtime) | Auth y permisos por fila ya resueltos; tiempo real para el dashboard |
| Hosting | **Vercel** | Deploy continuo desde Git, costo inicial ~US$0â€“25/mes |
| Estado / datos | **TanStack Query** + Supabase JS client | CachÃ©, reintentos automÃ¡ticos (clave para el offline ligero) |
| ValidaciÃ³n | **Zod** | Esquemas compartidos entre formularios y API |

## 2. Arquitectura

```
[Navegador / celular en tienda]
        â”‚  HTTPS
        â–¼
[Next.js en Vercel] â”€â”€â”€â”€ Server Components (dashboard, cuadros imprimibles)
        â”‚                Client Components (captura diaria)
        â–¼
[Supabase]
  â”œâ”€ Auth (email/contraseÃ±a, sesiones JWT)
  â”œâ”€ PostgreSQL + RLS (fuente Ãºnica de verdad)
  â”œâ”€ Realtime (suscripciÃ³n a movimientos del dÃ­a para admin)
  â””â”€ Vistas SQL (sugeridos, vendido calculado, consolidados)
```

**Principio rector:** toda la lÃ³gica de negocio que pueda vivir en la base de datos (cÃ¡lculo de vendido, sugeridos, permisos) vive en la base de datos â€” vistas y RLS. El frontend solo captura y presenta.

## 3. Seguridad

- **RLS obligatorio en todas las tablas.** Rol `tienda`/`principal`: solo su `sucursal_id`. Rol `admin`: todo. (PolÃ­ticas ya definidas en `05-schema.sql`.)
- Funciones helper `security definer`: `rol_actual()`, `sucursal_actual()`, `es_admin()`.
- Nunca exponer la `service_role key` al cliente; solo `anon key` + RLS.
- Sesiones gestionadas por Supabase Auth con `@supabase/ssr` (cookies httpOnly).
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cliente); `SUPABASE_SERVICE_ROLE_KEY` solo en scripts de migraciÃ³n locales.

## 4. Requisitos no funcionales

| Requisito | Meta |
|---|---|
| Rendimiento mÃ³vil | Captura diaria usable en gama baja / 3G; LCP < 3 s |
| Resiliencia | Mutaciones con reintento automÃ¡tico (TanStack Query retry + cola en memoria); toast de estado "guardado / pendiente / reintentando" |
| Disponibilidad | La de Vercel + Supabase (sin SLA propio en MVP) |
| ImpresiÃ³n | Cuadros de producciÃ³n con CSS `@media print`, formato carta |
| Zona horaria | `America/Tegucigalpa` para el corte del "dÃ­a" de inventario |
| Idioma | UI 100 % en espaÃ±ol |

## 5. Estructura del repositorio

```
Genies/
â”œâ”€â”€ CLAUDE.md                  # contexto para Claude Code
â”œâ”€â”€ docs/                      # esta documentaciÃ³n
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migrations/            # SQL versionado (empieza con 05-schema.sql)
â”‚   â””â”€â”€ seed.sql               # sucursales + datos de prueba
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ (auth)/login/
â”‚   â”‚   â”œâ”€â”€ (app)/captura/     # captura diaria (tienda)
â”‚   â”‚   â”œâ”€â”€ (app)/dashboard/   # consolidado admin
â”‚   â”‚   â”œâ”€â”€ (app)/cuadros/     # cuadros de producciÃ³n imprimibles
â”‚   â”‚   â””â”€â”€ (app)/catalogos/   # admin: productos, reglas, usuarios
â”‚   â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ lib/supabase/          # clientes browser/server
â”‚   â””â”€â”€ lib/types.ts           # tipos generados desde Supabase
â””â”€â”€ ...
```

## 6. IntegraciÃ³n y migraciÃ³n de datos

- Los catÃ¡logos (`productos`, `departamentos`, `reglas_sugerido`) se cargan con un **script de migraciÃ³n** que lee el Excel del cliente (`xlsx` â†’ SQL inserts). El script vive en `scripts/migrar-excel.ts` y se corre una sola vez con la service key.
- Tipos TypeScript generados con `supabase gen types typescript`.

## 7. Testing

- **Unitario:** lÃ³gica de cÃ¡lculo (vendido, sugerido) con Vitest.
- **RLS:** tests SQL que verifican que una tienda no lee otra sucursal (criterio de aceptaciÃ³n #2 del PRD).
- **E2E ligero:** flujo captura â†’ cuadro con Playwright (happy path, antes de entregar).

## 8. Decisiones tÃ©cnicas registradas

1. **Una tabla `movimientos_diarios`** (fila = producto Ã— sucursal Ã— dÃ­a) en lugar de columnas por dÃ­a â€” elimina la fuente de errores del Excel.
2. **Vendido calculado, nunca digitado** â€” evita inconsistencias.
3. **Sugeridos como datos estructurados** (`reglas_sugerido`) + vista SQL â€” las reglas dejan de ser texto libre.
4. **Offline ligero, no offline-first** â€” reintento automÃ¡tico es suficiente segÃºn el cliente; ahorra semanas de complejidad de sincronizaciÃ³n.

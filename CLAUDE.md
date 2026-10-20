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
M0, M1 y M3 completados: login/logout, perfil (rol + sucursal) con redirect por rol, protección de rutas en middleware (rutas admin exigen rol admin), tipos generados (`src/lib/types.ts`) y RLS verificada con dos usuarios de prueba (`admin@genies.test`, `cypress@genies.test` — sucursal Cypress). Seed aplicado en Supabase. M3 (captura diaria): pantalla P3 con guardado por fila (debounce 800 ms + reintento TanStack Query), decoración solo Principal, cierre del día con modo lectura; verificado contra Supabase (upsert, RLS, cierre). M4 (dashboard y sugeridos): dashboard admin con Realtime (migración 0002 agrega tablas a la publicación) y cerrar/reabrir día por sucursal, /sugeridos con override inline (update-luego-insert para no pisar capturas), /historial (P9) server-rendered con filtros GET, nav por rol en el layout. Usuarios de prueba: cypress@genies.test / PruebaM3-2026 · admin@genies.test / AdminGenies-2026. M5 (cuadros): /cuadros genera un cuadro por departamento desde los sugeridos del día (cálculo compartido en `src/lib/sugeridos.ts`), con totales, marca "Decorar" e impresión carta (`@media print` + `break-after-page`). M2 (catálogo real): `scripts/migrar-excel.ts` corrido contra el Excel del cliente → `supabase/migrations/0003_catalogo_cliente.sql` aplicada en Supabase (17 departamentos, 133 productos, 812 reglas; reemplazó el seed de prueba). **Pendiente**: validar `docs/M2-validacion.md` con la administradora (11 advertencias: productos combinados sumados, un valor ilegible, decoración por sección). M6 (parcial): tests unitarios con vitest (`npm test` — fechas, resumen del día, parser de reglas) e integración RLS/flujo (`npm run verificar` — ⚠️ escribe y limpia la fila de hoy del primer producto; no correr en la sucursal piloto). Usuarios por sucursal creados (`<sucursal>@genies.test` / `Genies-<Sucursal>-2026`, placeholders hasta tener correos reales). Guía de encargadas en `docs/guia-encargada.md`. Peso de /captura ≈ 304 KB gzip (~6 s en 3G primera carga). **Pendiente de M6**: validación M2 con la administradora, correos reales, piloto 3–5 días en 1 sucursal, capacitación. Nota: env vars de Vercel en prod/preview son tipo "sensitive" — `vercel env pull` las devuelve vacías por diseño; verificar en el bundle desplegado.

## Reparto por pastelera (oct 2026)
Respuesta de la encargada: el "1*2*3*4" del Excel es **por tanda**; el reparto entre pasteleras es con **porcentaje fijo**; se reparte según las áreas de los cuadros; **una tablet por tienda** (las pasteleras usan la de Principal).
- Migraciones `0007_indices_rendimiento.sql` (índices de FK, aplicada) y `0008_reparto_pasteleras.sql` (aplicada en Supabase como SQL directo, por eso no figura en `schema_migrations`; verificada el 16 oct: tablas, 12 políticas, RPCs, Realtime; tablas `pasteleras`, `pasteleras_pin`, `planes_dia`, `asignaciones`; área especial "Decoración" con `areas_produccion.es_decoracion`; RPCs `reemplazar_asignaciones`, `fijar_pin_pastelera`, `verificar_pin_pastelera`, `registrar_avance`; Realtime).
- Lógica pura en `src/lib/reparto.ts` (mayor residuo, sobrante rota por día, decoración → área Decoración o, si está vacía, el área del producto) con tests; secciones en `src/lib/secciones-reparto.ts`.
- Pantallas: `/asignar` (admin: generar → ajustar por tanda T1–T4 → publicar; avance en vivo), `/asignar/imprimir` (hoja carta por pastelera), `/pasteleras` (admin: %, área, activa, PIN), `/cocina` (principal/admin: tablet, nombre + PIN opcional, marcar hechas/listo; vuelve sola a la portada tras 3 min).
- Total a repartir = suma de sugeridos de las sucursales (igual que el Total del cuadro).
- Hallazgos del Excel (para la dueña): en INVENTARIO DIARIO la columna CM de Century lee los cambios de Chalets; 5 filas de CM de Palenque leen Altara; 226 referencias inconsistentes en total.

## Pedidos de la reunión del 16 oct 2026
Resumen de la reunión en el Project de claude.ai (`claude/requerimientos-reunion-2026-10-16.md`).
- **Sin decorar**: `cargarSugeridosDelDia` trae también `sinDecorar` (lo que Principal anotó hoy en `movimientos_diarios.sin_decorar`). `totalesPorProducto` (`src/lib/sugeridos.ts`, con tests) da por producto: total, sin decorar, **hornear = total − sin decorar** y decorar = total. `/cuadros` muestra las columnas Sin decorar y Hornear; el reparto de producción usa Hornear y el de decoración el total.
- **Áreas en equipo** (migración `0010_areas_en_equipo.sql`, ⚠️ aplicarla en Supabase ANTES de desplegar): `areas_produccion.trabajo_en_equipo` (Producción 1 = Kenia y Dany queda en true). No se divide por %: todo va a la titular (primera activa por orden, `titularDeArea`), la hoja impresa y la columna de /asignar dicen "Kenia y Dany", y en /cocina cualquiera del equipo ve y marca la hoja compartida. `registrar_avance` ahora recibe `p_pastelera` (quién marca; se valida su PIN y que sea del mismo equipo). Interruptor en Catálogos → Áreas.
- **Hojas de despacho** (`/cuadros/despacho`, botón en Cuadros): hoja completa para empaque (casilla por tienda) y una hoja por tienda con Enviado / No se mandó.
- Pendiente: libras por batida (la dueña dirá cómo), que las pantallas se parezcan a su hoja (espera el Excel actualizado), control de pendientes no enviados en el sistema.

## Demo vie 16 oct 2026
- Datos: `DEMO_PERMITIR=1 npx tsx --env-file=.env.local scripts/datos-demo.ts` (reproducible; reescribe inventario y cierres de los 6 días de producción anteriores + hoy en TODAS las sucursales, borra el reparto de hoy; hoy Palenque queda "contando"). Guion en `docs/guion-demo.md`. Rango 2026-10-09→16 ya incluido en `limpiar-datos-demo.sql`.
- Con datos de hoy en Cypress, los E2E se niegan a correr (guarda): limpiar antes o esperar al día siguiente.
- La service key está en `.env.local` (no en Vercel todavía). Se pegó en el chat: rotarla después de la demo.

## Tests E2E
`npm run e2e` (Playwright, 25 tests, contra producción con guardas y limpieza; ver `e2e/README.md`). Navegador: `chromium-headless-shell` 1187; si `npx playwright install` se cuelga, descargar el zip de `playwright.download.prss.microsoft.com` y descomprimirlo en `~/Library/Caches/ms-playwright/chromium_headless_shell-1187/`.

## Navegación y lenguaje (oct 2026)
Pantallas **independientes, no secuenciales**: el admin entra a `/hoy` (portada con tarjetas Tiendas · Sugeridos · Cuadros · Reparto, cada una con su estado y un número de paso solo orientativo; `src/lib/paso-del-dia.ts` decide qué tarjeta resaltar, con tests). Menú corto por rol en `src/components/menu-principal.tsx` (admin: Hoy · Catálogos · Rotación · Historial; principal: Inventario · Cocina · Rotación · Historial; tienda sin Cocina). Grupos en `src/lib/grupos.ts`; cada pantalla usa `<EncabezadoSeccion>` (fila de botones a las demás del grupo, ícono, título, una línea de "para qué sirve") y `<Aviso>`. No usar enlaces "siguiente →/← anterior". Pasteleras vive dentro de Catálogos.
- **Colores**: solo tokens (`primary`, `secondary`, `exito`, `aviso`, `destructive` en `globals.css`, con modo oscuro); nada de hex en componentes (los hex de `color-dia.ts` son los colores físicos del día, a propósito).
- **Textos para gente no técnica**: "Inventario de hoy" (antes Captura), "Terminé el inventario de hoy", "Hacer el reparto", "Enviar a cocina / Quitar de la cocina", errores sin mensajes técnicos ("Revisá que haya internet…"). Se mantienen los términos del negocio (Ingreso, Devolución, Pedido, Sugerido, Cuadro). Las guías `docs/guia-encargada.md` y `docs/guia-cocina.md` ya usan estos nombres.

## Catálogos P8 (oct 2026)
`/catalogos` es un menú de tarjetas; cada catálogo es una pantalla independiente (`/catalogos/{productos,reglas,areas,departamentos,usuarios}` y `/pasteleras`) con una fila de botones para saltar entre ellas. Escriben con Server Actions (`src/lib/acciones/catalogos.ts`) usando la sesión del admin (RLS manda) y validan con Zod (`src/lib/esquemas-catalogos.ts`, con tests). "Dar de baja" = desactivar (nunca borrar: hay historial). Reglas: cada celda se reemplaza borrando e insertando, porque el unique no impide filas duplicadas con `dia_semana` null. Usuarios: el listado sale de la RPC `admin_usuarios()` (migración 0009, solo admin; 0007–0008 están en `feat/reparto-pasteleras`); **crear cuentas y cambiar contraseñas requiere `SUPABASE_SERVICE_ROLE_KEY` en el servidor** (`src/lib/supabase/admin.ts`, nunca en el cliente). Sin esa variable, la pantalla lo avisa y solo permite editar nombre, rol y sucursal.

## Áreas de producción (demo mié 6 ago 2026)
La encargada entregó un segundo Excel (`DISTRIBUCION PRODUCCION Y DECORACION.xlsx`) con la distribución de productos **por pastelera**. Los cuadros de `/cuadros` ahora salen por área de producción (6 áreas: Producción 1–5 y 4B/5B, con encargadas) en lugar de por departamento, más un cuadro de **Decoración** (repite los productos "Decorar") y uno final "Sin área asignada" (16 productos que el Excel no menciona). Generado por `scripts/distribucion-excel.ts` → migración `0004_areas_produccion.sql` (tabla `areas_produccion` + `productos.area_id/orden_area`). **Validar `docs/validacion-distribucion.md` con la administradora**: fusión 4B/5B en un cuadro, porciones en el área del producto base, interpretaciones ambiguas y filas del Excel sin producto en el catálogo.
- **Datos demo en Supabase** (jue 30 jul – mié 5 ago 2026, sin domingo): generados por SQL directo (no hay script en el repo); todos los días cerrados salvo Palenque el 5 ago (en_captura, muestra el aviso de pendientes). ⚠️ Borrarlos antes del piloto junto con los de julio: `delete from cierres_dia; delete from movimientos_diarios;` (rangos 2026-07-06 a 2026-07-21 y 2026-07-30 a 2026-08-05).

## Demo para la dueña (13 jul 2026)
- Marca: logo real en `public/logo-gennies.jpeg` (login, header, favicon `src/app/icon.png`); paleta crema/rosado/cobre en `globals.css`. La marca comercial es **Gennie's** (el proyecto sigue llamándose Genies).
- **Color del día** (`src/lib/color-dia.ts` + `<ChipColorDia>`): lunes rosado, martes azul, miércoles naranja, jueves verde, viernes amarillo, sábado negro; domingo sin producción (los cuadros no se generan). Visible en header, captura, dashboard y cuadros (también al imprimir).
- **Rotación** (`/rotacion`, ambos roles; `src/lib/rotacion.ts` con tests): estima la edad del saldo por FIFO sobre los ingresos de los últimos 7 días y la muestra con el color del día de producción. Reglas: 2 días = prioridad de venta; 3+ días = regresar a Principal para cambio. La tienda solo ve su sucursal (RLS).
- **Datos demo en Supabase** (semana 6–13 jul 2026): generados por SQL directo (no hay script en el repo). ⚠️ Borrarlos antes del piloto: `delete from cierres_dia; delete from movimientos_diarios;` (rango de fechas 2026-07-06 a 2026-07-13).

## Datos del cliente
Catálogo real migrado desde el Excel (hito M2, migración `0003_catalogo_cliente.sql`); `supabase/seed.sql` quedó obsoleto. Interpretación de reglas y advertencias en `docs/M2-validacion.md` — validar con la administradora antes del piloto.

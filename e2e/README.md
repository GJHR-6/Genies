# Tests E2E (Playwright)

Prueban la app como la usa la gente: navegador real, login por la pantalla,
clics y textos visibles. Hay dos tamaños: **celular 360 px** (encargada) y
**escritorio** (administración y tablet de cocina).

## ⚠️ Corren contra la base de PRODUCCIÓN

No hay otra base. Para que sea seguro:

- **Solo tocan la sucursal de prueba** (`Cypress`, se cambia con `E2E_SUCURSAL`)
  y cosas cuyo nombre empieza con `E2E ` (productos, departamentos) o cuentas
  `e2e-…@genies.test`.
- **Se niegan a correr** si la sucursal de prueba ya tiene inventario de hoy.
- **No tocan un reparto real**: si ya había reparto de hoy al empezar, ese test
  se salta.
- **Limpian al terminar**, aunque falle un test: inventario y cierre de hoy de
  la sucursal de prueba, el reparto que crearon, los objetivos que cambiaron
  (se restauran) y todo lo `E2E`.
- Los domingos se saltan los tests que necesitan producción.

**Durante el piloto no correrlos si la sucursal piloto es la de prueba.**

## Cómo correrlos

1. En `.env.local` agregá `SUPABASE_SERVICE_ROLE_KEY=…` (Supabase → Project
   Settings → API). Se usa **solo** para preparar y limpiar datos, y también
   habilita crear cuentas en Catálogos → Usuarios. Nunca se sube al repo.
2. Primera vez: `npx playwright install chromium-headless-shell`
3. `npm run e2e` (levanta la app sola en el puerto 3100).
   - Ver el reporte: `npx playwright show-report`
   - Solo uno: `npm run e2e -- e2e/reparto.e2e.ts`
4. Si una corrida se cortó a la mitad (Ctrl+C, se apagó la compu):
   `npm run e2e:limpiar`

## Qué cubren

| Archivo | Qué prueba |
|---|---|
| `inventario.movil.e2e.ts` | Encargada en celular: anotar, guardado solo, sin internet, buscador, terminar el día, permisos |
| `hoy.e2e.ts` | Portada Hoy, pantallas en cualquier orden, cerrar/abrir el día de una tienda, cambiar un sugerido, cuadros |
| `reparto.e2e.ts` | Hacer el reparto → enviar a cocina → pastelera marca listo en la tablet → admin ve el avance |
| `catalogos.e2e.ts` | Portada de catálogos, crear/editar producto y departamento, objetivos, crear una cuenta que entra, permisos de Principal |

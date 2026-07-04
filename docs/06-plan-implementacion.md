# Plan de implementaciÃ³n â€” Sistema Genies

**VersiÃ³n:** 1.0 Â· Alcance: Fase 1 (MVP, OpciÃ³n 2 contratada)

---

## Hitos

### M0 â€” Fundaciones (dÃ­a 1â€“2)
- [ ] Crear repo Git + proyecto Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui).
- [ ] Crear proyecto Supabase; correr `docs/05-schema.sql` como primera migraciÃ³n.
- [ ] Configurar `@supabase/ssr` (clientes browser/server) y middleware de sesiÃ³n.
- [ ] Deploy inicial a Vercel (pipeline funcionando desde el dÃ­a 1).
- **Entrega:** app vacÃ­a con login desplegada.

### M1 â€” AutenticaciÃ³n y roles (dÃ­a 3â€“4)
- [ ] PÃ¡gina de login + logout.
- [ ] Carga de perfil (rol + sucursal) y redirect por rol.
- [ ] ProtecciÃ³n de rutas (middleware) + verificaciÃ³n RLS con dos usuarios de prueba.
- **Entrega:** criterio de aceptaciÃ³n #2 del PRD validado (aislamiento entre sucursales).

### M2 â€” MigraciÃ³n de datos del cliente âš ï¸ dependencia externa
- [ ] Recibir `PRINCIPAL_Auto_inventario_diario.xlsx` actualizado.
- [ ] Script `scripts/migrar-excel.ts`: extraer catÃ¡logo de productos, departamentos y reglas de sugeridos â†’ inserts.
- [ ] Validar con la administradora que las reglas migradas coinciden con las del Excel (casos de prueba firmados).
- **Nota de riesgo:** este hito acota el esfuerzo de migraciÃ³n en el contrato; cualquier regla ambigua se resuelve con el cliente **antes** de programar sobre ella.

### M3 â€” Captura diaria (semana 2)
- [ ] Pantalla P3: lista por categorÃ­a, inputs ingreso/devoluciÃ³n/pedido, saldo anterior.
- [ ] Guardado automÃ¡tico por fila (upsert + debounce) con estados Guardado/Pendiente.
- [ ] Cola de reintento ante fallos de red (TanStack Query).
- [ ] Campos de decoraciÃ³n solo para Principal.
- [ ] Cierre del dÃ­a (`cierres_dia`) y modo lectura post-cierre.
- **Entrega:** criterio #1 y #5 del PRD.

### M4 â€” Dashboard y sugeridos (semana 3)
- [ ] Dashboard admin con estado por sucursal en tiempo real (Realtime).
- [ ] Vista de sugeridos (`v_sugeridos`) con ediciÃ³n inline (override).
- [ ] Historial por sucursal (P9).
- **Entrega:** criterio #4 (sugeridos coinciden con el Excel).

### M5 â€” Cuadros de producciÃ³n (semana 3â€“4)
- [ ] GeneraciÃ³n de cuadros por departamento desde los sugeridos del dÃ­a.
- [ ] Vista imprimible (`@media print`, formato carta) replicando formatos actuales.
- **Entrega:** criterio #3 â€” la admin imprime sin transcribir nada.

### M6 â€” Pulido, pruebas y capacitaciÃ³n (semana 4â€“5)
- [ ] Tests: unitarios de cÃ¡lculo, RLS, E2E del flujo completo.
- [ ] RevisiÃ³n de rendimiento en celular gama baja / 3G.
- [ ] Alta de usuarios reales (6 encargadas + admin).
- [ ] Piloto con 1 sucursal en paralelo al Excel (3â€“5 dÃ­as) â†’ luego rollout a las 6.
- [ ] CapacitaciÃ³n (sesiÃ³n con encargadas + guÃ­a de 1 pÃ¡gina) y documentaciÃ³n de uso.
- **Entrega:** MVP en producciÃ³n. Inicia soporte post-entrega de 30 dÃ­as.

## Orden de programaciÃ³n recomendado (para Claude Code)

1. `supabase/migrations/0001_schema.sql` (copiar de `docs/05-schema.sql`)
2. `src/lib/supabase/` + middleware + tipos generados
3. Login y perfiles (M1)
4. Captura diaria (M3) â€” la pantalla mÃ¡s importante; construir y probar a fondo
5. Dashboard + sugeridos (M4)
6. Cuadros imprimibles (M5)
7. CatÃ¡logos admin (P8) â€” al final; mientras tanto los datos se cargan por script/SQL

## Riesgos y mitigaciones

| Riesgo | Impacto | MitigaciÃ³n |
|---|---|---|
| Excel del cliente llega tarde o con reglas ambiguas | Bloquea M2/M4 | M0â€“M1 y M3 no dependen de Ã©l (se usa catÃ¡logo de prueba); congelar reglas por escrito |
| Internet inestable en tiendas | PÃ©rdida de datos percibida | Guardado por fila + cola de reintento + estados visibles (ya en diseÃ±o) |
| Cambios de alcance ("ya que estamosâ€¦") | Retraso y costo | Todo lo nuevo se anota para Fase 2; el spec firmado es el contrato |
| AdopciÃ³n de las encargadas | El sistema no se usa | Piloto en 1 sucursal, capacitaciÃ³n, UI que replica su lÃ³gica actual |

## DefiniciÃ³n de "terminado" (DoD) por tarea

CÃ³digo en TypeScript estricto sin `any` Â· RLS verificado si toca datos Â· funciona en mÃ³vil 360 px Â· textos en espaÃ±ol Â· merge a `main` solo con build de Vercel verde.

# UI / UX â€” Sistema Genies

**VersiÃ³n:** 1.0 Â· Complementa PRD y TRD

---

## 1. Principios de diseÃ±o

1. **MÃ³vil primero para tiendas, escritorio para admin.** Las encargadas capturan desde el celular; la administradora trabaja en computadora.
2. **Cero curva de aprendizaje.** Las pantallas replican la lÃ³gica mental del Excel actual (producto por fila, cifras del dÃ­a), no la reinventan.
3. **Dedos, no mouse.** Inputs numÃ©ricos grandes, teclado numÃ©rico nativo (`inputmode="numeric"`), targets â‰¥ 44 px.
4. **El estado de guardado siempre visible.** Con internet inestable, la usuaria debe saber si su dato ya estÃ¡ en el sistema: `Guardado âœ“` / `Pendiente âŸ³` / `Sin conexiÃ³n â€” reintentando`.
5. **EspaÃ±ol, lenguaje del negocio.** "Ingreso", "DevoluciÃ³n", "Pedido", "Sugerido", "Cuadro" â€” los mismos tÃ©rminos que usan hoy.

## 2. Sistema visual

- **TipografÃ­a:** Inter (o system-ui). Cifras en tabular-nums.
- **Colores:**
  - Primario: azul profundo `#1F4E79` (coherente con la propuesta comercial).
  - Ã‰xito/guardado: verde `#2E7D32` Â· Pendiente: Ã¡mbar `#B45309` Â· Error: rojo `#B3261E`.
  - Fondo app `#F7F9FB`, tarjetas blancas, bordes `#C9D2DA`.
- **Componentes:** shadcn/ui (Button, Input, Table, Card, Dialog, Toast, Badge, Tabs).
- **Densidad:** cÃ³moda en mÃ³vil (captura), compacta en escritorio (dashboard y cuadros).

## 3. Mapa de pantallas

| # | Pantalla | Rol | Dispositivo principal |
|---|---|---|---|
| P1 | Login | todos | ambos |
| P2 | Inicio del dÃ­a (selector fecha + resumen de avance) | tienda/principal | mÃ³vil |
| P3 | **Captura diaria** (lista de productos con inputs) | tienda/principal | mÃ³vil |
| P4 | ConfirmaciÃ³n de cierre del dÃ­a | tienda/principal | mÃ³vil |
| P5 | **Dashboard consolidado** (6 sucursales en tiempo real) | admin | escritorio |
| P6 | RevisiÃ³n y ajuste de sugeridos | admin | escritorio |
| P7 | **Cuadros de producciÃ³n** (por departamento, imprimible) | admin | escritorio + impresiÃ³n |
| P8 | CatÃ¡logos (productos, departamentos, reglas, usuarios) | admin | escritorio |
| P9 | Historial por sucursal | todos (segÃºn rol) | ambos |

## 4. EspecificaciÃ³n de pantallas clave

### P3 â€” Captura diaria (el corazÃ³n de la app)
- Encabezado fijo: sucursal, fecha, barra de progreso (`23/58 productos`).
- Lista agrupada por categorÃ­a; cada fila: nombre del producto + saldo anterior (solo lectura) + inputs **Ingreso / DevoluciÃ³n / Pedido**.
- En Principal: tabs o columnas extra **Decorado / Sin decorar**.
- **Guardado automÃ¡tico por fila** (on blur / debounce 800 ms) â€” nunca un botÃ³n "guardar todo" que pueda perderse.
- Buscador por nombre de producto arriba.
- Productos sin movimiento se dejan en 0 sin fricciÃ³n (default).

### P5 â€” Dashboard admin
- Grid de 6 tarjetas (una por sucursal): estado del dÃ­a (`Completo âœ“ / En captura âŸ³ / Sin iniciar`), hora del Ãºltimo registro.
- ActualizaciÃ³n en **tiempo real** (Supabase Realtime).
- CTA principal cuando todas cierran: **"Generar cuadros de producciÃ³n"**.

### P6 â€” Sugeridos
- Tabla producto Ã— sucursal con `sugerido` calculado y **editable inline** (el ajuste manual queda registrado como override del dÃ­a).
- Diferencia visual entre valor calculado (gris) y ajustado (azul, con punto indicador).

### P7 â€” Cuadros de producciÃ³n
- Un cuadro por departamento, rÃ©plica del formato en papel actual.
- BotÃ³n **Imprimir** â†’ CSS `@media print`: sin navegaciÃ³n, encabezado con fecha y departamento, formato carta.

## 5. Estados y errores

- **VacÃ­o:** primera vez del dÃ­a â†’ "AÃºn no hay registros. EmpezÃ¡ con el buscador o bajÃ¡ por la lista."
- **Conflicto de ediciÃ³n:** si admin y tienda editan la misma fila, gana el Ãºltimo guardado y se notifica con toast (last-write-wins, MVP).
- **SesiÃ³n expirada:** redirect a login conservando la URL de retorno.
- **Errores de red:** nunca bloquear la captura; encolar y mostrar badge `Pendiente`.

## 6. Accesibilidad

- Contraste AA mÃ­nimo, labels reales en todos los inputs, navegaciÃ³n completa por teclado en escritorio, `aria-live` para los estados de guardado.

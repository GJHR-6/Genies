# Guion de la demo — viernes 16 oct 2026

**Duración:** 12–15 min · **Color del día:** amarillo · **Estado al empezar:**
5 de 6 tiendas terminaron su inventario; **Palenque sigue contando**; sin
reparto todavía. La semana anterior (9–15 oct) tiene datos para Historial y
Rotación.

## Antes de empezar (5 min)

1. **Pantalla A — compu (lo que proyectás):** entrá como **admin**. Tiene que
   abrir en **Hoy** y decir *"Falta 1 tienda por terminar su inventario"*.
2. **Pantalla B — celular** (o una ventana de **otro navegador**, p. ej. Safari):
   entrá como **Palenque**. Una misma ventana no puede tener dos sesiones: si
   entrás con otra cuenta en el mismo navegador, se cierra la del admin.
3. Dejá en A la pestaña **Hoy → Tiendas** abierta.

| Quién | Correo | Contraseña |
|---|---|---|
| Administración | admin@genies.test | AdminGenies-2026 |
| Encargada Palenque | palenque@genies.test | Genies-Palenque-2026 |
| Tablet de cocina (Principal) | principal@genies.test | Genies-Principal-2026 |

**¿Ensayaste y tocaste datos?** Volvé al estado inicial con
`DEMO_PERMITIR=1 npx tsx --env-file=.env.local scripts/datos-demo.ts` (borra
también el reparto de hoy).

## La demo

### 1. El problema (30 s)
"Hoy cada tienda llena un Excel, alguien lo junta a mano y de ahí salen los
cuadros de producción. Esto lo reemplaza: cada tienda anota en su celular y los
cuadros salen solos."

### 2. La encargada, en el celular (B · 2 min)
- Abre directo en **Inventario de hoy**, con su tienda y el color del día.
- En el buscador escribí **`vain 8`** → aparece VAINILLA · 8X2.
- Anotá un **Ingreso** (ej. 6) y pasá al siguiente campo → **Guardado ✓**.
  *"No hay botón de guardar: cada número se guarda solo. Si se cae el
  internet sigue anotando y se guarda cuando vuelve la señal."*
- Bajá al final → **Terminé el inventario de hoy** → **Sí, terminé**.

### 3. La administración lo ve al instante (A · 1 min)
- En **Tiendas**, Palenque pasa sola a **Terminó ✓** (no hace falta recargar).
- Volvé a **Hoy** (botón *← Hoy* o el menú) → ahora dice *"Todas las tiendas
  terminaron"*. *"Las tarjetas se abren en el orden que quieran; el número es
  solo una guía."*

### 4. Sugeridos (A · 2 min)
- *"Cuánto producir para cada tienda: su objetivo menos lo que ya tiene."*
- Mostrá los **2 números con punto (•)**: cambiados a mano en Principal.
- Tocá un número, escribí otro, **Enter** → queda con •. Vacío = vuelve al
  calculado.

### 5. Cuadros (A · 1 min)
- Una hoja por área de producción, con las pasteleras y **DECORAR** marcado.
- **Imprimir cuadros** → vista de impresión (cada área en su página, con el
  color del día). Cancelá la impresión.

### 6. Reparto y tablet de cocina (A + B · 3 min)
- **Reparto → Hacer el reparto**: cada producto se divide solo entre las
  pasteleras del área según su porcentaje. Se puede pasar parte a otra tanda.
- **Enviar a cocina**.
- En **B**: **Salir** → entrá como **principal** → menú **Cocina** →
  *¿Quién sos?* → tocá **Kenia** → **✓ Listo** en un producto.
- En **A** (Reparto): *Cómo va la cocina* sube solo. En **Hoy**, la tarjeta
  Reparto dice *"En cocina: X de Y"*.

### 7. Rotación (A · 1 min)
- Menú **Rotación**: cada pastel lleva el color del día en que se hizo.
  **2 días = prioridad de venta**, **3 o más = regresar a Principal**.

### 8. Catálogos (A · 2 min)
- Menú **Catálogos**: tarjetas independientes.
- **Productos**: buscar, abrir uno y mostrar los campos (no guardes cambios).
- **Objetivos por tienda**: la tabla tienda × día (base del sugerido).
- **Pasteleras**: porcentajes por área y PIN de la tablet.

### 9. Cierre (30 s)
Siguientes pasos: validar el catálogo con la administradora, cargar correos
reales, piloto de 3–5 días en una sucursal junto con el Excel y capacitación.

## Si algo sale raro
- **Una pantalla no cambió:** recargá la página.
- **Se ve otra cuenta:** cada navegador guarda una sola sesión; usá Salir.
- **"Hoy es domingo":** la demo necesita un día de lunes a sábado.

## Después de la demo
Los datos son de prueba. Antes del piloto, borrarlos con
`supabase/mantenimiento/limpiar-datos-demo.sql` (ya incluye 9–16 oct).
